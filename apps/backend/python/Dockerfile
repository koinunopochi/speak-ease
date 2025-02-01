# apps/backend/python/Dockerfile
FROM python:3.8-slim

# ffmpeg をインストール
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを設定
WORKDIR /app

# 依存パッケージファイルを先にコピー（キャッシュ利用のため）
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードを全てコピー
COPY . .

# Flask はデフォルトでポート5000を利用
EXPOSE 5000

ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_APP=app.py
CMD ["flask", "run", "--debug"]
