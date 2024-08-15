import argparse
import subprocess
from pathlib import Path

# ANSI escape codes for colors
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def proxy_one(video_path, on_complete=None):
    video_dir = Path(video_path).parent
    video_name = Path(video_path).stem
    compressed_video_path = video_dir / f"{video_name}-compressed.mp4"

    command = f'ffmpeg -i "{video_path}" -vf scale=1920:-1 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 "{compressed_video_path}"'

    try:
        # Use subprocess.run instead of check_call for better error capture
        result = subprocess.run(command, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print(f"{Colors.GREEN}{Colors.BOLD}Video compression complete: {compressed_video_path}{Colors.RESET}")
    except subprocess.CalledProcessError as e:
        print(f"{Colors.RED}{Colors.BOLD}FFmpeg process exited with code {e.returncode}{Colors.RESET}")
        print(f"Error message: {e.stderr}")

    if on_complete:
        on_complete()

def main():
    parser = argparse.ArgumentParser(description="Compress a video file.")
    parser.add_argument("video_path", help="The path to the video file to compress.")
    
    args = parser.parse_args()
    
    # Validate if the provided file path exists
    if not Path(args.video_path).is_file():
        print(f"{Colors.RED}Error: The file '{args.video_path}' does not exist.{Colors.RESET}")
        return
    
    proxy_one(args.video_path)

if __name__ == "__main__":
    main()
