# test_app.py
import io
import unittest
from app import app
from pydub import AudioSegment
from pydub.generators import Sine

class FlaskAudioProcessingTestCase(unittest.TestCase):
    def setUp(self):
        # Flaskのテストクライアントを作成
        self.app = app.test_client()
        self.app.testing = True

    def generate_test_audio(self):
        """
        1秒間のトーン(440Hz) → 1秒間の無音 → 1秒間のトーン
        の音声を生成して、BytesIOオブジェクトとして返す
        """
        tone = Sine(440).to_audio_segment(duration=1000)  # 1秒間のトーン
        silence = AudioSegment.silent(duration=1000)        # 1秒間の無音
        audio = tone + silence + tone

        out_io = io.BytesIO()
        audio.export(out_io, format="wav")
        out_io.seek(0)
        return out_io

    def test_process_audio_normal(self):
        test_audio = self.generate_test_audio()
        # multipart/form-dataとしてファイルを送信
        data = {
            "file": (test_audio, "test.wav")
        }
        response = self.app.post("/process", data=data, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "audio/wav")
        # 返却されたデータが空でないかを確認
        self.assertTrue(len(response.data) > 0)

if __name__ == '__main__':
    unittest.main()
