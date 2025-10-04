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
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Trigger file picker
uploadBtn.addEventListener('click', () => fileInput.click());

// Handle file uploads
fileInput.addEventListener('change', async (event) => {
  const files = event.target.files;
  if (!files.length) return;

  for (const file of files) {
    console.log("Uploading:", file.name, file.type, file.size);

    if (file.size > MAX_FILE_SIZE) {
      alert(`${file.name} is too large (max 50MB).`);
      continue;
    }

    const timestamp = Date.now();
    const storageRef = storage.ref('wedding-photos/' + timestamp + '_' + file.name);

    try {
      await storageRef.put(file);
      const url = await storageRef.getDownloadURL();

      // Determine type (fallback if file.type is empty)
      let type = file.type;
      if (!type) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (['mp4', 'mov', 'webm'].includes(ext)) type = 'video/mp4';
        else type = 'image/jpeg';
      }

      displayMedia(url, type);

    } catch (error) {
      console.error("Upload failed for", file.name, error);
      alert(`Error uploading ${file.name}: ${error.message}`);
    }
  }

  fileInput.value = '';
  alert('Thank you! Your photos/videos have been uploaded.');
});

// Display media (photo or video)
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
    element.style.width = '100%';
    element.style.height = 'auto';
    element.style.display = 'block';
  } else if (type.startsWith('video/')) {
    element = document.createElement('video');
    element.src = url;
    element.controls = true;
    element.preload = 'metadata';
    element.style.width = '100%';
    element.style.height = 'auto';
  } else {
    console.warn("Unsupported file type:", type);
    return;
  }

  container.appendChild(element);
  gallery.prepend(container);
}

// Load latest 50 media files
async function loadGallery() {
  const listRef = storage.ref('wedding-photos/');
  try {
    const result = await listRef.listAll();

    // Sort files by timestamp in filename (newest first)
    const sortedItems = result.items.sort((a, b) => {
      const aName = a.name.split('_')[0];
      const bName = b.name.split('_')[0];
      return bName.localeCompare(aName);
    });

    const latest50 = sortedItems.slice(0, 50);

    for (const itemRef of latest50) {
      try {
        const url = await itemRef.getDownloadURL();
        const meta = await itemRef.getMetadata();
        const type = meta.contentType || (itemRef.name.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
        displayMedia(url, type);
      } catch (err) {
        console.error("Failed to load item:", itemRef.name, err);
      }
    }

  } catch (error) {
    console.error("Failed to load gallery:", error);
  }
}

loadGallery();
