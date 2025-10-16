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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const gallery = document.getElementById('gallery');
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

// Create and style progress bar
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

    const timestamp = Date.now();
    const storageRef = storage.ref(`wedding-photos/${timestamp}_${file.name}`);

    const uploadTask = storageRef.put(file);
    progressContainer.style.display = 'block';

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
function displayMedia(url, type) {
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
  } else if (type.startsWith('video/')) {
    element = document.createElement('video');
    element.src = url;
    element.controls = true;
    element.preload = 'metadata';
    element.loading = 'lazy';
    element.style.width = '100%';
    element.style.height = 'auto';
  } else {
    console.warn("Unsupported file type:", type);
    return;
  }

  container.appendChild(element);
  gallery.prepend(container);
}

// --- Lazy Load Latest 50 Media ---
async function loadGallery(limit = 10) {
  const listRef = storage.ref('wedding-photos/');
  try {
    const result = await listRef.listAll();

    const sortedItems = result.items.sort((a, b) => {
      const aName = a.name.split('_')[0];
      const bName = b.name.split('_')[0];
      return bName.localeCompare(aName);
    });

    const latest = sortedItems.slice(0, limit);

    for (const itemRef of latest) {
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

    // Add "Load More" button if there are more items
    if (sortedItems.length > limit && !document.getElementById('loadMoreBtn')) {
      const loadMoreBtn = document.createElement('button');
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

      loadMoreBtn.addEventListener('click', () => {
        gallery.innerHTML = '';
        loadGallery(limit + 10);
      });

      gallery.appendChild(loadMoreBtn);
    }

  } catch (error) {
    console.error("Failed to load gallery:", error);
  }
}

loadGallery();
