Insert here the videos in .mp4/.webm/.ogg format linked to their corresponding .txt file for generating the description.

If you want to generate sbtitles from a video:

# 1. Install Whisper and ffmpeg
	1- pip install openai-whisper ffmpeg-python
	2- download https://github.com/GyanD/codexffmpeg/releases/download/8.0.1/ffmpeg-8.0.1-full_build.zip e copia la cartella bin in C:/ffmpeg/bin
	3- add ffmpeg to path: $env:PATH += ';C:\ffmpeg\bin'

# 2. [OPTIONAL] Extract audio from video (Whisper accepts complete video anyway)
	1- ffmpeg -i video.mp4 -vn -acodec mp3 audio.mp3

# 3. Generate subtitles
	1- whisper video.mp4 --language English --task transcribe --output_format vtt
	2- for example: C:\Users\MMezzana\AppData\Local\Programs\Python\Python310\Scripts\whisper.exe "C:\Users\MMezzana\Downloads\jentile\site\Video\Seccamani.mp4" --language Italian --task transcribe --output_format vtt