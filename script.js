import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp, doc, setDoc, getDoc, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Menambahkan getDocs dan where

// KONFIGURASI FIREBASE ANDA SENDIRI
const firebaseConfig = {
  apiKey: "AIzaSyBwnI_TYzjlXITopmauKjVTvw-aXBr-xkQ",
  authDomain: "hut-ri-cc014.firebaseapp.com",
  projectId: "hut-ri-cc014",
  storageBucket: "hut-ri-cc014.firebasestorage.app",
  messagingSenderId: "463670140480",
  appId: "1:463670140480:web:734e71d421161d934289a5",
  measurementId: "G-41ZM3RYY6S"
};

const appId = firebaseConfig.projectId;

let app;
let db;
let auth;
let currentUserId = null;
let currentUserName = null;
let hasCelebrated = false;

// Elemen modal konfirmasi hapus
const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
let deleteImageId = null; // Untuk menyimpan ID gambar yang akan dihapus

function showMessageBox(message, type = 'success') {
    const msgBox = document.getElementById('message-box');
    if (msgBox) {
        msgBox.textContent = message;
        msgBox.className = `message-box ${type} show`;
        setTimeout(() => {
            msgBox.classList.remove('show');
        }, 3000);
    } else {
        console.warn('Message box element not found!');
    }
}

function updateMainUserNameDisplay() {
    const userNameDisplayMain = document.getElementById('user-name-display-main');
    if (userNameDisplayMain && currentUserName) {
        userNameDisplayMain.textContent = `Selamat datang, ${currentUserName}!`;
    } else if (userNameDisplayMain) {
         userNameDisplayMain.textContent = `Selamat datang, Anonim!`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded.");

    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');
    const celebrateButton = document.getElementById('celebrate-button');
    const celebrationMessage = document.getElementById('celebration-message');
    const countdownMessage = document.getElementById('countdown-message');
    const confettiContainer = document.getElementById('confetti-container');
    const imageUrlInput = document.getElementById('image-url-input');
    const addImageButton = document.getElementById('add-image-button');
    const imageGalleryContainer = document.getElementById('image-gallery-container');
    const userIdDisplay = document.getElementById('user-id-display');
    const celebratorsListContainer = document.getElementById('celebrators-list-container');


    const nameModalOverlay = document.getElementById('name-modal-overlay');
    const nameInput = document.getElementById('name-input');
    const saveNameButton = document.getElementById('save-name-button');
    const userNameDisplayMain = document.getElementById('user-name-display-main');

    console.log("Using Firebase Project ID:", appId);
    console.log("Using Firebase Config:", firebaseConfig);

    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase initialized successfully.");

        onAuthStateChanged(auth, async (user) => {
            console.log("onAuthStateChanged triggered. User object:", user);
            if (user) {
                currentUserId = user.uid;
                if (userIdDisplay) {
                    userIdDisplay.textContent = `ID Pengguna Anda: ${currentUserId}`;
                }
                console.log("Authenticated with user ID:", currentUserId);

                const userProfileRef = doc(db, `artifacts/${appId}/users/${currentUserId}/profile/user_data`);
                let userProfileSnap;
                try {
                    userProfileSnap = await getDoc(userProfileRef);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    showMessageBox("Gagal memuat profil pengguna. Pastikan aturan keamanan Firebase sudah benar.", "error");
                }

                if (userProfileSnap && userProfileSnap.exists() && userProfileSnap.data().name) {
                    currentUserName = userProfileSnap.data().name;
                    localStorage.setItem('userName', currentUserName);
                    updateMainUserNameDisplay();
                    console.log("Loaded user name from Firestore:", currentUserName);
                    if (nameModalOverlay) nameModalOverlay.classList.remove('show');
                } else {
                    const storedName = localStorage.getItem('userName');
                    if (storedName) {
                        currentUserName = storedName;
                        updateMainUserNameDisplay();
                        try {
                            await setDoc(userProfileRef, { name: currentUserName, lastLogin: serverTimestamp() }, { merge: true });
                        } catch (error) {
                            console.error("Error saving stored name to Firestore profile:", error);
                            showMessageBox("Gagal menyimpan nama lokal ke cloud. Periksa aturan keamanan.", "error");
                        }
                    } else {
                        if (nameModalOverlay) nameModalOverlay.classList.add('show');
                    }
                }

                setupGalleryListener();
                setupCelebratorsListener();
                checkIfAlreadyCelebrated();

                if (loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                        if (mainContent) {
                            mainContent.style.transform = 'scale(1)';
                        }
                    }, 500);
                }

            } else {
                console.log("No user signed in. Attempting anonymous sign-in.");
                try {
                    await signInAnonymously(auth);
                    console.log("Signed in anonymously.");
                } catch (error) {
                    console.error("Firebase Auth Error during sign-in:", error);
                    showMessageBox("Gagal otentikasi. Coba lagi nanti.", "error");
                    if (loadingScreen) loadingScreen.style.display = 'none';
                    if (nameModalOverlay) nameModalOverlay.classList.add('show');
                }
            }
        });

    } catch (error) {
        console.error("Firebase initialization failed:", error);
        showMessageBox("Gagal memuat layanan inti. Coba refresh halaman.", "error");
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (nameModalOverlay) nameModalOverlay.classList.add('show');
        return;
    }


    function updateCountdown() {
        const now = new Date();
        const independenceDay = new Date(now.getFullYear(), 7, 17, 0, 0, 0);

        if (now > independenceDay) {
            independenceDay.setFullYear(now.getFullYear() + 1);
        }

        const timeLeft = independenceDay.getTime() - now.getTime();

        if (countdownMessage) {
            if (timeLeft <= 0) {
                countdownMessage.textContent = "Dirgahayu Republik Indonesia! Merdeka!";
            } else {
                const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                countdownMessage.textContent = `Menuju HUT RI ke-80: ${days} hari ${hours} jam ${minutes} menit ${seconds} detik lagi!`;
            }
        }
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();

    function generateConfetti() {
        const colors = ['red', 'white', 'gold'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti ' + colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            confetti.style.transform = `scale(${0.5 + Math.random()})`;
            if (confettiContainer) {
                confettiContainer.appendChild(confetti);
            }

            confetti.addEventListener('animationend', () => {
                confetti.remove();
            });
        }
    }

    async function checkIfAlreadyCelebrated() {
        if (!currentUserId || !db) return;
        try {
            const celebratorsCollectionRef = collection(db, `artifacts/${appId}/public/data/celebrators`);
            const q = query(celebratorsCollectionRef, where("userId", "==", currentUserId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                hasCelebrated = true;
                if (celebrateButton) {
                    celebrateButton.textContent = 'SUDAH MERAYAKAN!';
                    celebrateButton.disabled = true;
                    celebrateButton.classList.remove('bg-red-600', 'hover:bg-red-700');
                    celebrateButton.classList.add('bg-gray-400', 'cursor-not-allowed');
                }
                if (celebrationMessage) {
                    celebrationMessage.classList.remove('hidden');
                }
            } else {
                hasCelebrated = false;
                if (celebrateButton) {
                    celebrateButton.textContent = 'KLIK UNTUK MERAYAKAN!';
                    celebrateButton.disabled = false;
                    celebrateButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
                    celebrateButton.classList.add('bg-red-600', 'hover:bg-red-700');
                }
                if (celebrationMessage) {
                    celebrationMessage.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error("Error checking celebration status:", error);
        }
    }


    if (celebrateButton) {
        celebrateButton.addEventListener('click', async () => {
            if (hasCelebrated) {
                showMessageBox("Anda sudah merayakan! Terima kasih!", "info");
                return;
            }

            if (!currentUserId || !currentUserName) {
                showMessageBox("Silakan masukkan nama Anda terlebih dahulu sebelum merayakan!", "error");
                if (nameModalOverlay) nameModalOverlay.classList.add('show');
                return;
            }

            try {
                let userImageUrl = null;
                // Try to find the most recent image uploaded by the current user
                const galleryCollectionRef = collection(db, `artifacts/${appId}/public/data/gallery_images`);
                const qUserImages = query(galleryCollectionRef, where("userId", "==", currentUserId));
                const userImagesSnapshot = await getDocs(qUserImages);

                if (!userImagesSnapshot.empty) {
                    const userImages = [];
                    userImagesSnapshot.forEach(doc => {
                        userImages.push({ id: doc.id, ...doc.data() });
                    });
                    // Sort client-side by timestamp descending to get the most recent
                    userImages.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                    userImageUrl = userImages[0].url; // Get the URL of the most recent image
                }


                const celebratorsCollectionRef = collection(db, `artifacts/${appId}/public/data/celebrators`);
                await addDoc(celebratorsCollectionRef, {
                    userId: currentUserId,
                    userName: currentUserName,
                    timestamp: serverTimestamp(),
                    userImageUrl: userImageUrl || null // Store the image URL or null
                });

                hasCelebrated = true;
                if (celebrationMessage) {
                    celebrationMessage.classList.remove('hidden');
                }
                generateConfetti();
                celebrateButton.textContent = 'TERIMA KASIH!';
                celebrateButton.disabled = true;
                celebrateButton.classList.remove('bg-red-600', 'hover:bg-red-700');
                celebrateButton.classList.add('bg-gray-400', 'cursor-not-allowed');
                showMessageBox("Perayaan Anda telah direkam! Merdeka!", "success");

            } catch (error) {
                console.error("Error recording celebration:", error);
                showMessageBox("Gagal mencatat perayaan. Coba lagi.", "error");
            }
        });
    }

    // Fungsi untuk menghapus gambar dari Firestore
    async function deleteImage(imageId) {
        if (!currentUserId || !db) {
            showMessageBox("Otentikasi belum siap untuk menghapus gambar.", "error");
            return;
        }

        // Tampilkan modal konfirmasi
        confirmModalOverlay.classList.remove('hidden');
        
        return new Promise((resolve) => {
            const onConfirm = async () => {
                confirmModalOverlay.classList.add('hidden');
                confirmDeleteBtn.removeEventListener('click', onConfirm);
                cancelDeleteBtn.removeEventListener('click', onCancel);

                try {
                    const imageDocRef = doc(db, `artifacts/${appId}/public/data/gallery_images`, imageId);
                    await deleteDoc(imageDocRef);
                    showMessageBox("Gambar berhasil dihapus!", "success");
                    resolve(true);
                } catch (error) {
                    console.error("Error deleting image:", error);
                    showMessageBox("Gagal menghapus gambar. Periksa aturan keamanan Firestore Anda.", "error");
                    resolve(false);
                }
            };

            const onCancel = () => {
                confirmModalOverlay.classList.add('hidden');
                confirmDeleteBtn.removeEventListener('click', onConfirm);
                cancelDeleteBtn.removeEventListener('click', onCancel);
                showMessageBox("Penghapusan dibatalkan.", "info");
                resolve(false);
            };

            confirmDeleteBtn.addEventListener('click', onConfirm);
            cancelDeleteBtn.addEventListener('click', onCancel);
        });
    }


    function renderGallery(images) {
        if (!imageGalleryContainer) return;

        imageGalleryContainer.innerHTML = '';
        if (images.length === 0) {
            imageGalleryContainer.innerHTML = '<p class="text-gray-500 mt-4">Belum ada foto dalam galeri. Ayo unggah yang pertama!</p>';
            return;
        }
        images.forEach(imgData => {
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'w-full md:w-1/3 p-2 flex-shrink-0 relative';

            const imgElement = document.createElement('img');
            imgElement.src = imgData.url;
            imgElement.alt = 'Foto Perayaan HUT RI';
            imgElement.className = 'w-full h-48 object-cover rounded-lg shadow-md hover:scale-105 transition-transform duration-200 cursor-pointer';

            imgElement.onerror = (event) => {
                event.target.src = `https://placehold.co/400x300/CCCCCC/000000?text=Gambar+Rusak`;
                event.target.alt = `Gambar tidak dapat dimuat: ${imgData.url}`;
                console.error("Failed to load image:", imgData.url);
            };

            const caption = document.createElement('p');
            caption.className = 'text-xs text-gray-500 mt-1 truncate';
            caption.textContent = `Diunggah oleh: ${imgData.userName || (imgData.userId ? imgData.userId.substring(0, 8) + '...' : 'Anonim')}`;

            const deleteButton = document.createElement('button');
            deleteButton.className = 'absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md transition-opacity duration-200 opacity-80 hover:opacity-100 focus:outline-none';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt text-sm"></i>';
            deleteButton.title = "Hapus Gambar Ini";
            deleteButton.addEventListener('click', () => {
                deleteImage(imgData.id);
            });

            imgWrapper.appendChild(imgElement);
            imgWrapper.appendChild(caption);
            imgWrapper.appendChild(deleteButton);
            imageGalleryContainer.appendChild(imgWrapper);
        });
    }

    function renderCelebrators(celebrators) {
        if (!celebratorsListContainer) return;

        celebratorsListContainer.innerHTML = '';
        if (celebrators.length === 0) {
            celebratorsListContainer.innerHTML = '<p class="text-gray-600 col-span-full mt-4">Belum ada yang merayakan. Jadilah yang pertama!</p>';
            return;
        }

        celebrators.forEach(celebratorData => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-lg shadow-md text-center transform transition-transform duration-200 hover:scale-105 flex flex-col items-center'; // Added flexbox for vertical alignment
            
            // Add image if available
            if (celebratorData.userImageUrl) {
                const imgElement = document.createElement('img');
                imgElement.src = celebratorData.userImageUrl;
                imgElement.alt = `Foto ${celebratorData.userName}`;
                imgElement.className = 'w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-red-500 shadow-md'; // Styling for profile image
                imgElement.onerror = (event) => {
                    event.target.src = `https://placehold.co/64x64/CCCCCC/000000?text=Foto`;
                    event.target.alt = `Gambar tidak dimuat`;
                };
                card.appendChild(imgElement);
            }

            const name = document.createElement('p');
            name.className = 'text-lg font-semibold text-gray-800 break-words';
            name.textContent = celebratorData.userName || 'Anonim';

            const timestamp = document.createElement('p');
            timestamp.className = 'text-xs text-gray-500 mt-1';
            if (celebratorData.timestamp && celebratorData.timestamp.toDate) {
                timestamp.textContent = `Merayakan pada: ${celebratorData.timestamp.toDate().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                timestamp.textContent = `Merayakan: Tidak diketahui`;
            }

            card.appendChild(name);
            card.appendChild(timestamp);
            celebratorsListContainer.appendChild(card);
        });
    }

    function setupCelebratorsListener() {
        try {
            const celebratorsCollectionRef = collection(db, `artifacts/${appId}/public/data/celebrators`);
            const q = query(celebratorsCollectionRef); // orderBy("timestamp", "desc") is removed to avoid index issues.
            onSnapshot(q, (snapshot) => {
                const celebrators = [];
                snapshot.forEach(doc => {
                    celebrators.push({ id: doc.id, ...doc.data() });
                });
                // Sort client-side by timestamp if orderBy is not used in query
                celebrators.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                renderCelebrators(celebrators);
            }, (error) => {
                console.error("Error fetching celebrators:", error);
                showMessageBox("Gagal memuat daftar perayaan. Periksa koneksi Anda.", "error");
            });
        } catch (error) {
            console.error("Error setting up celebrators listener:", error);
            showMessageBox("Kesalahan saat mengatur daftar perayaan.", "error");
        }
    }


    if (addImageButton) {
        addImageButton.addEventListener('click', async () => {
            const imageUrl = imageUrlInput.value.trim();
            if (imageUrl) {
                try {
                    new URL(imageUrl);
                    if (!currentUserId) {
                        showMessageBox("Sistem belum siap. Coba refresh halaman atau pastikan nama Anda sudah terdaftar.", "error");
                        return;
                    }
                    const galleryCollectionRef = collection(db, `artifacts/${appId}/public/data/gallery_images`);
                    await addDoc(galleryCollectionRef, {
                        url: imageUrl,
                        userId: currentUserId,
                        userName: currentUserName,
                        timestamp: serverTimestamp()
                    });
                    imageUrlInput.value = '';
                    showMessageBox("Foto berhasil ditambahkan ke galeri!", "success");
                    // After successfully adding an image, if the user hasn't celebrated, re-check their status
                    if (!hasCelebrated) {
                        checkIfAlreadyCelebrated();
                    }
                } catch (error) {
                    console.error("Error adding document or invalid URL:", error);
                    if (error instanceof TypeError && error.message.includes("Failed to construct 'URL'")) {
                        showMessageBox("URL gambar tidak valid. Pastikan formatnya benar (mis. http://example.com/image.jpg).", "error");
                    } else {
                        showMessageBox("Gagal menambahkan foto. Coba lagi.", "error");
                    }
                }
            } else {
                showMessageBox("Silakan masukkan URL gambar.", "error");
            }
        });
    }

    function setupGalleryListener() {
        try {
            const galleryCollectionRef = collection(db, `artifacts/${appId}/public/data/gallery_images`);
            onSnapshot(query(galleryCollectionRef), (snapshot) => {
                const images = [];
                snapshot.forEach(doc => {
                    images.push({ id: doc.id, ...doc.data() });
                });
                images.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                renderGallery(images);
            }, (error) => {
                console.error("Error fetching gallery images:", error);
                showMessageBox("Gagal memuat galeri foto. Periksa koneksi Anda dan aturan keamanan Firebase.", "error");
            });
        } catch (error) {
            console.error("Error setting up gallery listener:", error);
            showMessageBox("Kesalahan saat mengatur galeri.", "error");
        }
    }

    if (saveNameButton) {
        saveNameButton.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            if (name) {
                currentUserName = name;
                localStorage.setItem('userName', name);

                if (currentUserId && db) {
                     const userProfileRef = doc(db, `artifacts/${appId}/users/${currentUserId}/profile/user_data`);
                     try {
                         await setDoc(userProfileRef, { name: name, createdAt: serverTimestamp() }, { merge: true });
                         showMessageBox("Nama Anda telah disimpan!", "success");
                     } catch (error) {
                         console.error("Error saving name to Firestore:", error);
                         showMessageBox("Gagal menyimpan nama ke cloud. Disimpan secara lokal saja.", "error");
                     }
                } else {
                    showMessageBox("Nama disimpan secara lokal. Otentikasi belum siap untuk menyimpan ke cloud.", "info");
                }

                if (nameModalOverlay) nameModalOverlay.classList.remove('show');
                updateMainUserNameDisplay();
            } else {
                showMessageBox("Nama tidak boleh kosong!", "error");
            }
        });
    }
});
