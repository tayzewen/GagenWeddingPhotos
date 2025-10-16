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
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

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

// --- Compress Images Only ---
async function compressImage(file) {
  if (!file.type.startsWith('image/')) return file; // videos are untouched
  const options = {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8
  };
  return await imageCompression(file, options);
}

// --- Upload Handling ---
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (event) => {
  const files = event.target.files;
  if (!files.length) return;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      alert(`${file.name} is too large (please keep videos under ~1 minute).`);
      continue;
    }

    progressContainer.style.display = 'block';
    const timestamp = Date.now();
    const storageRef = storage.ref(`wedding-photos/${timestamp}_${file.name}`);

    const fileToUpload = file.type.startsWith('image/') ? await compressImage(file) : file;

    const uploadTask = storageRef.put(fileToUpload);

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
        displayMedia(url, file.type || getTypeFromName(file.name));
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

// --- Display Media (with Lazy Loading) ---
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
  } else if (type.startsWith('video/')) {
    element = document.createElement('video');
    element.src = url;
    element.controls = true;
    element.preload = 'metadata';
    element.style.width = '100%';
    element.style.height = 'auto';

    // Generate thumbnail from first frame
    const videoForThumb = document.createElement('video');
    videoForThumb.src = url;
    videoForThumb.preload = 'metadata';
    videoForThumb.muted = true;
    videoForThumb.currentTime = 0.1; // small offset to ensure metadata is loaded
    videoForThumb.addEventListener('loadeddata', () => {
      const canvas = document.createElement('canvas');
      canvas.width = videoForThumb.videoWidth;
      canvas.height = videoForThumb.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoForThumb, 0, 0, canvas.width, canvas.height);
      element.poster = canvas.toDataURL('image/jpeg');
    });

    container.appendChild(element);
  } else {
    console.warn("Unsupported file type:", type);
    return;
  }

  gallery.appendChild(container);
}


// --- Gallery Loader with "Load More" ---
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
        const type = meta.contentType || getTypeFromName(itemRef.name);
        displayMedia(url, type);
      } catch (err) {
        console.error("Failed to load item:", itemRef.name, err);
      }
    }

    // Handle Load More button
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

        loadMoreBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          currentLimit += 10;
          await loadGallery(currentLimit);
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
