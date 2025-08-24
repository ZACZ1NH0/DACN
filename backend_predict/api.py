from flask import Flask, request, jsonify
from transformers import BertTokenizer, BertForSequenceClassification
import torch
from transformers import BertTokenizerFast
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  
model = BertForSequenceClassification.from_pretrained("./bert_url_model")
tokenizer = BertTokenizerFast.from_pretrained("./bert_url_model")

model.eval()


# Dự đoán nhãn
def predict_label(text):
    model.eval()
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        print("Logits:", logits)
        predicted_class = torch.argmax(logits, dim=1).item()
        print("Predicted class:", predicted_class)
    return predicted_class

# Route API
@app.route("/check", methods=["POST"])
def predict():
    data = request.get_json()
    if not data or "url" not in data:
        return jsonify({"error": "Missing 'url' in request"}), 400
    
    url = data.get('url', '')
    prediction = predict_label(url)
    result = {
            "url": url,
            "malicious": prediction == 1
        }
    return jsonify(result)
    

# Chạy server
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
