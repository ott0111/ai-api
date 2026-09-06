# iPhone Upload Guide

This folder is already arranged as a GitHub repository.

## Easiest method on iPhone
1. Download `x-autopilot-github-upload.zip`.
2. Open it in the iPhone Files app to extract the folder.
3. Open GitHub in Safari and create an empty repository named `x-autopilot`.
4. Open the repository and choose **Add file → Upload files**.
5. Select the files/folder from the extracted project.
6. Commit the upload.

GitHub's web uploader supports uploading files and folders. Keep `.env.example`, but NEVER upload a real `.env` or API keys.

## Important
The project is intentionally configured with placeholders only. Add secrets later through your deployment platform, not by committing them to GitHub.
