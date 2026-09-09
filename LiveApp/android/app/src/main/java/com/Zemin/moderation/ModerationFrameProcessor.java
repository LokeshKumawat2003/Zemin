package com.Zemin.moderation;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageFormat;
import android.graphics.Rect;
import android.graphics.YuvImage;
import android.util.Log;

import com.oney.WebRTCModule.videoEffects.VideoFrameProcessor;

import org.webrtc.SurfaceTextureHelper;
import org.webrtc.VideoFrame;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;

public class ModerationFrameProcessor implements VideoFrameProcessor {
  private static final String TAG = "ModerationFrame";
  private static final long SAVE_INTERVAL_MS = 400;
  private long lastSavedAt = 0;

  @Override
  public VideoFrame process(VideoFrame frame, SurfaceTextureHelper textureHelper) {
    long now = System.currentTimeMillis();
    if (now - lastSavedAt >= SAVE_INTERVAL_MS) {
      lastSavedAt = now;
      try {
        saveFrame(frame);
      } catch (Exception error) {
        Log.w(TAG, "Failed to save moderation frame", error);
      }
    }
    return frame;
  }

  private void saveFrame(VideoFrame frame) throws Exception {
    VideoFrame.I420Buffer buffer = frame.getBuffer().toI420();
    try {
      int width = buffer.getWidth();
      int height = buffer.getHeight();
      if (width <= 0 || height <= 0) {
        return;
      }

      byte[] nv21 = i420ToNv21(buffer, width, height);
      YuvImage yuvImage = new YuvImage(nv21, ImageFormat.NV21, width, height, null);
      ByteArrayOutputStream jpegStream = new ByteArrayOutputStream();
      yuvImage.compressToJpeg(new Rect(0, 0, width, height), 70, jpegStream);
      byte[] jpegBytes = jpegStream.toByteArray();
      Bitmap bitmap = BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.length);
      if (bitmap == null) {
        return;
      }

      File outputDir = ModerationFrameStore.getCacheDir();
      if (outputDir == null) {
        return;
      }
      if (!outputDir.exists()) {
        outputDir.mkdirs();
      }
      File outputFile = new File(outputDir, "frame-" + System.currentTimeMillis() + ".jpg");
      try (FileOutputStream outputStream = new FileOutputStream(outputFile)) {
        bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream);
      }
      bitmap.recycle();
      ModerationFrameStore.setLatestFrame(outputFile.getAbsolutePath());
    } finally {
      buffer.release();
    }
  }

  private static byte[] i420ToNv21(VideoFrame.I420Buffer i420, int width, int height) {
    int frameSize = width * height;
    byte[] nv21 = new byte[frameSize + frameSize / 2];
    ByteBuffer yBuffer = i420.getDataY();
    ByteBuffer uBuffer = i420.getDataU();
    ByteBuffer vBuffer = i420.getDataV();
    int yStride = i420.getStrideY();
    int uStride = i420.getStrideU();
    int vStride = i420.getStrideV();

    int pos = 0;
    for (int row = 0; row < height; row++) {
      yBuffer.position(row * yStride);
      yBuffer.get(nv21, pos, width);
      pos += width;
    }

    int chromaHeight = height / 2;
    int chromaWidth = width / 2;
    for (int row = 0; row < chromaHeight; row++) {
      for (int col = 0; col < chromaWidth; col++) {
        nv21[pos++] = vBuffer.get(row * vStride + col);
        nv21[pos++] = uBuffer.get(row * uStride + col);
      }
    }
    return nv21;
  }
}
