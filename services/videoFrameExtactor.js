 const ffmpeg =
  require("fluent-ffmpeg");

const ffmpegPath =
  require("ffmpeg-static");

const path =
  require("path");

const fs =
  require("fs");

ffmpeg.setFfmpegPath(
  ffmpegPath
);

const extractFrames =
  async (
    videoPath,
    auditId
  ) => {

    if (
      !videoPath
    ) {
      throw new Error(
        "Video path required"
      );
    }

    const absoluteVideoPath =
      path.resolve(
        videoPath
      );

    if (
      !fs.existsSync(
        absoluteVideoPath
      )
    ) {
      throw new Error(
        `Video not found: ${absoluteVideoPath}`
      );
    }

    const outputDir =
      path.join(
        __dirname,
        "../uploads/frames",
        String(auditId)
      );

    if (
      fs.existsSync(
        outputDir
      )
    ) {
      fs.rmSync(
        outputDir,
        {
          recursive: true,
          force: true
        }
      );
    }

    fs.mkdirSync(
      outputDir,
      {
        recursive: true
      }
    );

    return new Promise(
      (
        resolve,
        reject
      ) => {

        ffmpeg(
          absoluteVideoPath
        )
          .output(
            path.join(
              outputDir,
              "frame-%03d.jpg"
            )
          )
          .outputOptions([
            "-vf fps=1"
          ])
          .on(
            "start",
            command => {

              console.log(
                "🎥 FFMPEG STARTED"
              );

              console.log(
                command
              );
            }
          )
          .on(
            "end",
            () => {

              const files =
                fs
                  .readdirSync(
                    outputDir
                  )
                  .filter(
                    file =>
                      file.endsWith(
                        ".jpg"
                      )
                  )
                  .map(
                    file =>
                      path.join(
                        outputDir,
                        file
                      )
                  );

              console.log(
                `📸 Extracted ${files.length} frames`
              );

              resolve(
                files
              );
            }
          )
          .on(
            "error",
            error => {

              console.error(
                "FFMPEG ERROR:",
                error
              );

              reject(
                error
              );
            }
          )
          .run();
      }
    );
  };

module.exports = {
  extractFrames
};
