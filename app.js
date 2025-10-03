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

// Trigger file picker
uploadBtn.addEventListener('click', () => fileInput.click());

// Handle file uploads
fileInput.addEventListener('change', async (event) => {
  const files = event.target.files;
  if (!files.length) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const storageRef = storage.ref('wedding-photos/' + Date.now() + '_' + file.name);

    try {
      await storageRef.put(file);
      const url = await storageRef.getDownloadURL();

      // Add uploaded photo to gallery
      const img = document.createElement('img');
      img.src = url;
      gallery.appendChild(img);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Error uploading " + file.name);
    }
  }

  fileInput.value = ''; // reset input
  alert('Thank you! Your photos have been uploaded.');
});

// Load existing photos on page load (only latest 50)
async function loadGallery() {
  const listRef = storage.ref('wedding-photos/');
  try {
    const result = await listRef.listAll();

    // Sort files by name (we used Date.now() in the filename, so newer = larger number)
    const sortedItems = result.items.sort((a, b) => {
      const aName = a.name.split('_')[0];
      const bName = b.name.split('_')[0];
      return bName.localeCompare(aName); // newest first
    });

    // Take only the first 50
    const latest50 = sortedItems.slice(0, 50);

    for (const itemRef of latest50) {
      const url = await itemRef.getDownloadURL();
      const img = document.createElement('img');
      img.src = url;
      gallery.appendChild(img);
    }
  } catch (error) {
    console.error("Failed to load gallery:", error);
  }
}


loadGallery();
