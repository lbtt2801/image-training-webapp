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
        const res = await fetch('/api/crop-plate', { method: 'POST', body: formData });
        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const img = document.getElementById('croppedPlate');
            img.src = url;
            img.classList.add('show');
            document.getElementById('platePlaceholder').style.display = 'none';
            // Ẩn kết quả cũ nếu có
            document.getElementById('resultBox').style.display = 'none';
        } else {
            document.getElementById('platePlaceholder').innerHTML = "Không tìm thấy biển số!";
        }
    } catch (err) {
        document.getElementById('platePlaceholder').innerHTML = "Lỗi server";
    }
};

// Nút B: Đọc biển số
// document.getElementById('btnRead').onclick = async () => {
//     if (!currentFile) return alert("Chưa chọn ảnh!");

//     const formData = new FormData();
//     formData.append("file", currentFile);

//     const resultBox = document.getElementById('resultBox');
//     const textEl = document.getElementById('licensePlateText');
//     resultBox.style.display = 'block';
//     textEl.textContent = "Đang nhận dạng biển số...";

//     try {
//         const res = await fetch('/api/read-plate', { method: 'POST', body: formData });
//         const data = await res.json();
//         textEl.textContent = data.text || "Không đọc được biển số";
//     } catch (err) {
//         console.error(err);
//         textEl.textContent = "Lỗi kết nối server";
//     }
// };
document.getElementById('btnRead').onclick = async () => {
    if (!currentFile) return alert("Chưa chọn ảnh!");

    const resultBox = document.getElementById('resultBox');
    const textEl = document.getElementById('licensePlateText');
    resultBox.style.display = 'block';
    textEl.textContent = "Đang nhận dạng...";

    const formData = new FormData();
    formData.append("file", currentFile);

    try {
        const res = await fetch('/api/read-plate', { method: 'POST', body: formData });
        const data = await res.json();
        textEl.textContent = data.text || "Không đọc được";
    } catch (err) {
        textEl.textContent = "Lỗi kết nối";
    }
};

// Đóng modal ảnh biển số đã cắt
function closeCropModal() {
    document.getElementById('cropModal').style.display = 'none';
}

// Đóng modal khi click ngoài
window.addEventListener('click', e => {
    if (e.target === document.getElementById('cropModal')) {
        closeCropModal();
    }
});



const label = document.querySelector('.custom-upload');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    label.addEventListener(event, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});

['dragenter', 'dragover'].forEach(event => {
    label.addEventListener(event, () => label.classList.add('dragover'));
});

['dragleave', 'drop'].forEach(event => {
    label.addEventListener(event, () => label.classList.remove('dragover'));
});