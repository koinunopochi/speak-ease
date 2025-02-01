import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { NextResponse } from 'next/server';

// コンテナで使うパスのベース (volumesで /data にマウントしている前提)
const CONTAINER_BASE_PATH = '/data';
const CONTAINER_UPLOADS = `${CONTAINER_BASE_PATH}/uploads`;
const CONTAINER_PROCESSED = `${CONTAINER_BASE_PATH}/processed`;

async function removeLongSilences(
  hostInputPath,
  hostOutputPath,
  containerInputPath,
  containerOutputPath
) {
  const ffmpegCommand = `
    docker exec ffmpeg_service ffmpeg \\
      -i "${containerInputPath}" \\
      -af "silenceremove=\\
start_periods=1:start_duration=1:start_threshold=-30dB:\\
stop_periods=-1:stop_duration=1:stop_threshold=-30dB:\\
detection=rms" \\
      "${containerOutputPath}"
  `;

  console.log('ffmpegCommand:', ffmpegCommand);

  return new Promise((resolve, reject) => {
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpegエラー:', error);
        console.error('stderr:', stderr);
        reject(error);
        return;
      }
      // ↓ここでもstderrに何か警告が出ていないか確認する
      console.log('stderr(警告含む):', stderr);
      console.log('stdout:', stdout);
      resolve();
    });
  });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────
    // 1) ホスト側パスを用意 (Windowsマシン上での実際の保存先)
    // ───────────────────────────────────────────
    const baseDir = path.join(process.cwd(), 'data');
    const uploadsDir = path.join(baseDir, 'uploads');
    const processedDir = path.join(baseDir, 'processed');
    // 今回はtempDirを使わないなら省略可
    // const tempDir = path.join(baseDir, 'temp');

    await mkdir(uploadsDir, { recursive: true });
    await mkdir(processedDir, { recursive: true });
    // await mkdir(tempDir, { recursive: true });

    // ファイル名
    const timestamp = Date.now();
    const originalFilename = `user-${timestamp}.wav`
    const processedFilename = `user-processed-${timestamp}.wav`

    // ホストOS上での絶対パス
    const hostInputPath = path.join(uploadsDir, originalFilename);
    const hostOutputPath = path.join(processedDir, processedFilename);

    // ───────────────────────────────────────────
    // 2) コンテナ内部パスを用意 (/data/... で指定)
    // ───────────────────────────────────────────
    const containerInputPath = `${CONTAINER_UPLOADS}/${originalFilename}`;
    const containerOutputPath = `${CONTAINER_PROCESSED}/${processedFilename}`;

    // ───────────────────────────────────────────
    // 3) アップロードされた音声ファイルをホストOSに保存
    // ───────────────────────────────────────────
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(hostInputPath, buffer);

    // ───────────────────────────────────────────
    // 4) FFmpegをDockerコンテナで実行 (コンテナ内部パスを指定)
    // ───────────────────────────────────────────
    await removeLongSilences(
      hostInputPath,
      hostOutputPath,
      containerInputPath,
      containerOutputPath
    );

    // ───────────────────────────────────────────
    // 5) 処理が終わったら元ファイルを削除しておく(任意)
    // ───────────────────────────────────────────
    // await unlink(hostInputPath).catch((err) => {
    //   console.error('元のファイル削除エラー:', err);
    // });

    // ───────────────────────────────────────────
    // 6) レスポンス
    // ───────────────────────────────────────────
    return NextResponse.json({
      success: true,
      filename: processedFilename,
    });
  } catch (error) {
    console.error('Error handling audio upload:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}
