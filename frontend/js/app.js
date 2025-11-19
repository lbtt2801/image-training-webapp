let currentFile = null;
let currentImageUrl = null;

// Khi người dùng chọn ảnh → hiện preview + ẨN khung upload
document.getElementById('imageInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    currentFile = file;

    // Dọn dẹp URL cũ (tránh rò rỉ bộ nhớ)
    if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
    currentImageUrl = URL.createObjectURL(file);

    // Cập nhật preview
    document.getElementById('previewImage').src = currentImageUrl;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatBytes(file.size);

    // HIỆN phần preview
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('resultBox').style.display = 'none';

    // ẨN khung upload ban đầu
    document.querySelector('.upload-section').style.display = 'none';

    // Cuộn mượt đến ảnh
    document.querySelector('.preview-section').scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
});

// Hàm định dạng dung lượng
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Nút A: Cắt biển số → hiện ngay bên phải (không cần modal)
document.getElementById('btnCrop').onclick = async () => {
    if (!currentFile) return alert("Chưa chọn ảnh!");

    const formData = new FormData();
    formData.append("file", currentFile);

    document.getElementById('platePlaceholder').innerHTML = "Đang cắt biển số...";

    try {
        const res = await fetch('http://127.0.0.1:5000/api/crop-plate', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const img = document.getElementById('croppedPlate');
            img.src = url;
            img.classList.add('show');
            document.getElementById('platePlaceholder').style.display = 'none';
            document.getElementById('resultBox').style.display = 'none';
        } else {
            const text = await res.text();
            document.getElementById('platePlaceholder').innerHTML = text.includes("Không tìm thấy")
                ? "Không tìm thấy biển số!"
                : `Lỗi: ${res.status}`;
        }
    } catch (err) {
        console.error(err);
        document.getElementById('platePlaceholder').innerHTML = "Lỗi kết nối server";
    }
};

// ==================== NÚT B: ĐỌC BIỂN SỐ (ĐÃ FIX URL) ====================
document.getElementById('btnRead').onclick = async () => {
    if (!currentFile) return alert("Chưa chọn ảnh!");

    const resultBox = document.getElementById('resultBox');
    const textEl = document.getElementById('licensePlateText');
    resultBox.style.display = 'block';
    textEl.textContent = "Đang nhận dạng...";

    const formData = new FormData();
    formData.append("file", currentFile);

    try {
        const res = await fetch('http://127.0.0.1:5000/api/read-plate', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        textEl.textContent = data.text?.trim() || "Không đọc được";
    } catch (err) {
        console.error(err);
        textEl.textContent = "Lỗi kết nối server";
    }
};

// ==================== DRAG & DROP ====================
const dropZone = document.querySelector('.custom-upload');
const fileInput = document.getElementById('imageInput');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Hiệu ứng khi kéo vào/ra
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

// QUAN TRỌNG: Xử lý khi người dùng thả file vào
dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        // Chỉ lấy file đầu tiên (giống như khi chọn từ input)
        const file = files[0];

        // Kiểm tra định dạng ảnh
        if (!file.type.match('image.*')) {
            alert('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)');
            return;
        }

        // Gán file vào input để tận dụng lại logic đã có
        fileInput.files = files;

        // Kích hoạt sự kiện change để chạy preview như bình thường
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
    }
}