import subprocess
from pathlib import Path
import shutil

def compress_video(video_path, output_path):
    compressed_video_path = output_path / video_path.name
    ffmpeg_command = f'ffmpeg -i "{video_path}" -vf scale=3840x2160 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 23 "{compressed_video_path}"'
    subprocess.run(ffmpeg_command, shell=True, check=True)
    return compressed_video_path

def compress_image(image_path, output_path):
    compressed_image_path = output_path / f"{image_path.stem}.jpg"
    ffmpeg_command = f'ffmpeg -i "{image_path}" "{compressed_image_path}"'
    subprocess.run(ffmpeg_command, shell=True, check=True)
    return compressed_image_path

def copy_to_proxy_destination(compressed_path, shoot_folder_name, original_camera_dir, proxy_destination_base):
    destination_dir = proxy_destination_base / original_camera_dir
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination_path = destination_dir / compressed_path.name
    shutil.copy(compressed_path, destination_path)

def is_allowed_non_video_file(file):
    allowed_extensions = ['.jpg', '.jpeg', '.gif', '.drp']
    return any(file.name.lower().endswith(ext) for ext in allowed_extensions)

def needs_image_compression(file):
    compressible_image_extensions = ['.png', '.tiff', '.cr2']
    return any(file.name.lower().endswith(ext) for ext in compressible_image_extensions)

def is_video_file(file):
    video_extensions = ['.mp4', '.mov', '.m4v']
    return any(file.name.lower().endswith(ext) for ext in video_extensions)

def copy_non_video_file(source_path, shoot_folder_name, original_camera_dir, proxy_destination_base):
    destination_dir = proxy_destination_base / original_camera_dir
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination_path = destination_dir / source_path.name
    shutil.copy(source_path, destination_path)

def make_proxy(directory_path):
    omitted_files = []
    shoot_folder_name = directory_path.name
    proxy_destination = Path('/Users/ll-studio/Desktop/_proxy')

    if proxy_destination.exists():
        raise Exception(f"A directory already exists at {proxy_destination}. Please remove or rename the existing directory before proceeding.")

    proxy_root_dir = directory_path.parent / f"{shoot_folder_name}_proxy"
    proxy_root_dir.mkdir(parents=True, exist_ok=True)

    camera_dirs = [d for d in directory_path.iterdir() if d.is_dir()]

    for camera_dir in camera_dirs:
        camera_proxy_dir_path = proxy_root_dir / camera_dir.name
        camera_proxy_dir_path.mkdir(parents=True, exist_ok=True)

        for file in camera_dir.iterdir():
            if is_video_file(file):
                compressed_video_path = compress_video(file, camera_proxy_dir_path)
                copy_to_proxy_destination(compressed_video_path, shoot_folder_name, camera_dir.name, proxy_destination)
            elif needs_image_compression(file):
                compressed_image_path = compress_image(file, camera_proxy_dir_path)
                copy_to_proxy_destination(compressed_image_path, shoot_folder_name, camera_dir.name, proxy_destination)
            elif is_allowed_non_video_file(file):
                copy_non_video_file(file, shoot_folder_name, camera_dir.name, proxy_destination)
            else:
                omitted_files.append(file.name)

    omitted_files_path = proxy_destination / 'omitted_files.txt'
    omitted_files_path.write_text('\n'.join(omitted_files))
    shutil.rmtree(proxy_root_dir)
    print(f"{shoot_folder_name} has been proxied.")

def main(directory_path):
    if not directory_path:
        print('Please provide the shoot directory path.')
        return
    make_proxy(Path(directory_path))

if __name__ == "__main__":
    import sys
    main(Path(sys.argv[1]))
