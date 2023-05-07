import os
import openai
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)
openai.api_key = "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"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    prompt = data.get('prompt')

    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    )

    return jsonify({"response": response['choices'][0]['message']['content']})

if __name__ == '__main__':
    app.run()