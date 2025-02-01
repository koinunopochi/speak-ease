# app.py
from flask import Flask, request, send_file, jsonify
from pydub import AudioSegment
from pydub.silence import split_on_silence
from io import BytesIO
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)

# -------------- Loggingの設定 --------------
# ログファイル名や、ファイルサイズの上限、バックアップの個数などを設定
log_handler = RotatingFileHandler("app.log", maxBytes=1_000_000, backupCount=5)
log_handler.setLevel(logging.INFO)
log_formatter = logging.Formatter("[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
log_handler.setFormatter(log_formatter)

# Flask の標準ロガーにハンドラーを追加
app.logger.addHandler(log_handler)
app.logger.setLevel(logging.INFO)
# -------------------------------------------

@app.route("/process", methods=["POST"])
def process_audio():
    app.logger.info("Received request to /process")
    
    # アップロードされたファイルがあるか確認
    if "file" not in request.files:
        app.logger.error("No file provided in request")
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files["file"]

    try:
        # ここではwebmファイルを想定しています
        audio = AudioSegment.from_file(file, format="webm")
        app.logger.info("Audio file loaded successfully")
    except Exception as e:
        app.logger.exception("Failed to process audio file")
        return jsonify({"error": f"Failed to process audio: {e}"}), 400

    # 無音部分を検出してチャンクに分割
    chunks = split_on_silence(
        audio,
        min_silence_len=700,                # 700ms以上の無音を検出
        silence_thresh=audio.dBFS - 16,     # 無音とみなす閾値（例：全体平均より16dB下）
        keep_silence=200                    # チャンク先頭・末尾に200ms分の無音を保持
    )
    app.logger.info(f"Split audio into {len(chunks)} chunks")

    # 各チャンクの間に固定の500msの無音を挿入
    fixed_gap = AudioSegment.silent(duration=500)
    output_audio = AudioSegment.empty()
    for chunk in chunks:
        output_audio += chunk + fixed_gap

    # 結果をWAV形式でBytesIOに出力
    out_io = BytesIO()
    output_audio.export(out_io, format="webm")
    out_io.seek(0)
    app.logger.info("Processed audio exported successfully")

    try:
      # ファイルとして返却
      return send_file(
          out_io,
          mimetype="audio/webm",
          as_attachment=True,
          download_name="processed.webm",  # こちらに変更
      )
    except Exception as e:
      app.logger.exception("Error in process_audio")
      return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.logger.info("Starting Flask app")
    app.run(host="0.0.0.0", debug=True)
