// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCw3fQNtxoaoOvyMPS0pL0kq9XcP7sAum0",
  authDomain: "gagenweddingalbum.firebaseapp.com",
  projectId: "gagenweddingalbum",
  storageBucket: "gagenweddingalbum.firebasestorage.app",
  messagingSenderId: "902292221591",
  appId: "1:902292221591:web:91528780a07290bf1843d2",
  measurementId: "G-31RV2D8G34"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const gallery = document.getElementById('gallery');
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB limit

// --- Progress Bar ---
const progressContainer = document.createElement('div');
progressContainer.style.width = '80%';
progressContainer.style.maxWidth = '300px';
progressContainer.style.height = '10px';
progressContainer.style.borderRadius = '5px';
progressContainer.style.overflow = 'hidden';
progressContainer.style.background = '#ddd';
progressContainer.style.margin = '1rem auto';
progressContainer.style.display = 'none';

const progressBar = document.createElement('div');
progressBar.style.height = '100%';
progressBar.style.width = '0%';
progressBar.style.background = '#333';
progressBar.style.transition = 'width 0.3s ease';

progressContainer.appendChild(progressBar);
document.getElementById('add-photos').appendChild(progressContainer);

// --- Compression ---
async function compressImage(file) {
  if (file.type.startsWith('image/')) {
    const options = {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8
    };
    return await imageCompression(file, options);
  }
  return file; // videos handled separately
}

// --- Generate Video Thumbnail ---
async function generateVideoThumbnail(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.crossOrigin = "anonymous";

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 1);
    };

    video.onerror = (err) => reject(err);
  });
}

// --- Upload Handling ---
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (event) => {
  const files = event.target.files;
  if (!files.length) return;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      alert(`${file.name} is too large (max 200MB).`);
      continue;
    }

    progressContainer.style.display = 'block';
    const timestamp = Date.now();

    let uploadFile = file;
    let thumbnailBlob = null;

    if (file.type.startsWith('image/')) {
      uploadFile = await compressImage(file);
    } else if (file.type.startsWith('video/')) {
      try {
        thumbnailBlob = await generateVideoThumbnail(file);
      } catch (err) {
        console.warn("Thumbnail generation failed, using placeholder.", err);
      }
    }

    // Upload main file
    const storageRef = storage.ref(`wedding-photos/${timestamp}_${file.name}`);
    const uploadTask = storageRef.put(uploadFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressBar.style.width = `${progress}%`;
      },
      (error) => {
        console.error("Upload failed for", file.name, error);
        alert(`Error uploading ${file.name}: ${error.message}`);
        progressContainer.style.display = 'none';
      },
      async () => {
        progressBar.style.width = '100%';
        setTimeout(() => {
          progressContainer.style.display = 'none';
          progressBar.style.width = '0%';
        }, 1000);

        const url = await uploadTask.snapshot.ref.getDownloadURL();

        let thumbnailURL = null;
        if (thumbnailBlob) {
          // Upload thumbnail to Firebase
          const thumbRef = storage.ref(`wedding-photos-thumbnails/${timestamp}_${file.name}.png`);
          await thumbRef.put(thumbnailBlob);
          thumbnailURL = await thumbRef.getDownloadURL();
        }

        displayMedia(url, file.type || getTypeFromName(file.name), thumbnailURL);
      }
    );
  }

  fileInput.value = '';
});

// --- Helpers ---
function getTypeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'video/mp4';
  return 'image/jpeg';
}

// --- Display Media ---
async function displayMedia(url, type) {
  const container = document.createElement('div');
  container.style.marginBottom = '1rem';
  container.style.width = '100%';
  container.style.maxWidth = '350px';
  container.style.borderRadius = '8px';
  container.style.overflow = 'hidden';

  let element;

  if (type.startsWith('image/')) {
    element = document.createElement('img');
    element.src = url;
    element.loading = 'lazy';
    element.style.width = '100%';
    element.style.height = 'auto';
    element.style.display = 'block';
    container.appendChild(element);
    gallery.appendChild(container);
  } 
  else if (type.startsWith('video/')) {
    // Create video element
    element = document.createElement('video');
    element.src = url;
    element.controls = true;
    element.preload = 'metadata';
    element.style.width = '100%';
    element.style.height = 'auto';

    container.appendChild(element);
    gallery.appendChild(container);

    // Generate thumbnail dynamically
    const thumbCanvas = document.createElement('canvas');
    const thumbVideo = document.createElement('video');
    thumbVideo.src = url;
    thumbVideo.crossOrigin = "anonymous"; // may be needed if videos are CORS-protected
    thumbVideo.muted = true;

    thumbVideo.addEventListener('loadeddata', () => {
      thumbCanvas.width = thumbVideo.videoWidth;
      thumbCanvas.height = thumbVideo.videoHeight;
      const ctx = thumbCanvas.getContext('2d');
      ctx.drawImage(thumbVideo, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const dataURL = thumbCanvas.toDataURL('image/jpeg');
      element.poster = dataURL; // set thumbnail
      thumbVideo.remove(); // cleanup
    });
  } 
  else {
    console.warn("Unsupported file type:", type);
  }
}


// --- Gallery Loader ---
let currentLimit = 10;

async function loadGallery(limit = currentLimit) {
  const listRef = storage.ref('wedding-photos/');
  try {
    const result = await listRef.listAll();

    const sortedItems = result.items.sort((a, b) => {
      const aName = a.name.split('_')[0];
      const bName = b.name.split('_')[0];
      return bName.localeCompare(aName);
    });

    const currentCount = gallery.querySelectorAll('div').length;
    const nextItems = sortedItems.slice(currentCount, limit);

    for (const itemRef of nextItems) {
      try {
        const [url, meta] = await Promise.all([
          itemRef.getDownloadURL(),
          itemRef.getMetadata()
        ]);

        let thumbnailURL = null;
        if (meta.contentType.startsWith('video/')) {
          const thumbRef = storage.ref(`wedding-photos-thumbnails/${itemRef.name}.png`);
          try {
            thumbnailURL = await thumbRef.getDownloadURL();
          } catch {
            thumbnailURL = '/img/video-placeholder.png';
          }
        }

        displayMedia(url, meta.contentType || getTypeFromName(itemRef.name), thumbnailURL);
      } catch (err) {
        console.error("Failed to load item:", itemRef.name, err);
      }
    }

    // Load More button
    let loadMoreBtn = document.getElementById('loadMoreBtn');
    if (sortedItems.length > limit) {
      if (!loadMoreBtn) {
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'loadMoreBtn';
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.style.margin = '1rem auto';
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.style.fontFamily = 'Alegreya Sans SC, sans-serif';
        loadMoreBtn.style.backgroundColor = '#333';
        loadMoreBtn.style.color = '#fff';
        loadMoreBtn.style.borderRadius = '70px';
        loadMoreBtn.style.padding = '0.6rem 1.5rem';
        loadMoreBtn.style.cursor = 'pointer';

        loadMoreBtn.addEventListener('click', async () => {
          const previousScroll = window.scrollY;
          currentLimit += 10;
          await loadGallery(currentLimit);
          window.scrollTo({ top: previousScroll, behavior: 'smooth' });
        });

        gallery.appendChild(loadMoreBtn);
      }
    } else if (loadMoreBtn) {
      loadMoreBtn.remove();
    }

  } catch (error) {
    console.error("Failed to load gallery:", error);
  }
}

loadGallery();
