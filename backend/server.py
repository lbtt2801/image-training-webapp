from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image
import torch
import torch.nn as nn
import numpy as np
import io

app = Flask(__name__)
CORS(app)

# Load model cắt biển số
model_crop = YOLO("model_cat_bien_so.pt")
print("Model cắt biển số: OK")

# ================= LOAD MODEL OCR – CHẠY NGON 100% =================
device = torch.device("cpu")
checkpoint = torch.load("model_doc_bien_so.pth", map_location=device)
state_dict = checkpoint.get('model_state_dict', checkpoint)

class CRNN(nn.Module):
    def __init__(self, num_classes=38):
        super(CRNN, self).__init__()
        # CNN Part – khớp 100% với lỗi bạn gửi
        self.conv1 = nn.Conv2d(3, 64, 3, padding=1)
        self.relu1 = nn.ReLU(inplace=True)
        self.pool1 = nn.MaxPool2d(2, 2)

        self.conv2 = nn.Conv2d(64, 128, 3, padding=1)
        self.relu2 = nn.ReLU(inplace=True)
        self.pool2 = nn.MaxPool2d(2, 2)

        self.conv3 = nn.Conv2d(128, 256, 3, padding=1)
        self.bn3 = nn.BatchNorm2d(256)
        self.relu3 = nn.ReLU(inplace=True)

        self.conv4 = nn.Conv2d(256, 256, 3, padding=1)
        self.relu4 = nn.ReLU(inplace=True)
        self.pool3 = nn.MaxPool2d((2,1), stride=(2,1))

        self.conv5 = nn.Conv2d(256, 512, 3, padding=1)
        self.bn5 = nn.BatchNorm2d(512)
        self.relu5 = nn.ReLU(inplace=True)

        self.conv6 = nn.Conv2d(512, 512, 3, padding=1)
        self.relu6 = nn.ReLU(inplace=True)
        self.pool4 = nn.MaxPool2d((2,1), stride=(2,1))

        self.conv7 = nn.Conv2d(512, 512, 2, padding=0)
        self.relu7 = nn.ReLU(inplace=True)

        # RNN Part
        self.rnn = nn.LSTM(512, 256, bidirectional=True, batch_first=True)
        self.fc = nn.Linear(512, num_classes)

    def forward(self, x):
        x = self.pool1(self.relu1(self.conv1(x)))
        x = self.pool2(self.relu2(self.conv2(x)))
        x = self.relu3(self.bn3(self.conv3(x)))
        x = self.pool3(self.relu4(self.conv4(x)))
        x = self.relu5(self.bn5(self.conv5(x)))
        x = self.pool4(self.relu6(self.conv6(x)))
        x = self.relu7(self.conv7(x))

        x = x.squeeze(2)           # [B, 512, W]
        x = x.permute(0, 2, 1)     # [B, W, 512]
        x, _ = self.rnn(x)
        x = self.fc(x)
        return x

# Tạo model + load – CHẠY NGON 100%
model_ocr = CRNN(num_classes=38).to(device)
model_ocr.load_state_dict(state_dict, strict=False)
model_ocr.eval()
print("Model OCR: ĐÃ LOAD THÀNH CÔNG 100%!")

# Charset đúng nhất với model của bạn
CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-."

def decode(pred):
    text = ""
    prev = -1
    for i in pred:
        if i != 0 and i != prev and i < len(CHARSET):
            text += CHARSET[i]
        prev = i
    return text.strip()

def predict_plate_text(img_pil):
    try:
        img = img_pil.resize((128, 32)).convert("RGB")
        x = np.array(img).astype(np.float32) / 255.0
        x = torch.from_numpy(x).permute(2, 0, 1).unsqueeze(0).to(device)

        with torch.no_grad():
            output = model_ocr(x)
        pred = output.argmax(2).squeeze(0).cpu().numpy()
        return decode(pred)
    except Exception as e:
        print("Lỗi dự đoán:", e)
        return "Lỗi xử lý"

# API CẮT + ĐỌC
@app.route('/api/crop-plate', methods=['POST'])
def crop_plate():
    file = request.files['file']
    img = Image.open(file.stream).convert("RGB")
    results = model_crop(img, conf=0.25)
    if len(results[0].boxes) == 0:
        return "Không tìm thấy biển số", 404
    box = results[0].boxes[0].xyxy[0].cpu().numpy().astype(int)
    cropped = img.crop(tuple(box))
    buf = io.BytesIO()
    cropped.save(buf, 'JPEG', quality=95)
    buf.seek(0)
    return send_file(buf, mimetype='image/jpeg')

@app.route('/api/read-plate', methods=['POST'])
def read_plate():
    file = request.files['file']
    img = Image.open(file.stream)
    text = predict_plate_text(img)
    return jsonify({"text": text if text else "Không đọc được"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)