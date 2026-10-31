import os
import sys
import subprocess
import webbrowser
import time

def main():
    print("=" * 60)
    print(" Brightloop Software - Subscription Management Platform ")
    print("=" * 60)

    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    venv_python = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    print("\nStarting Brightloop FastAPI backend on http://127.0.0.1:8000 ...")
    env = os.environ.copy()
    env["PYTHONPATH"] = backend_dir

    backend_process = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir,
        env=env
    )

    time.sleep(2)
    print("\nBackend started! Interactive API docs: http://127.0.0.1:8000/docs")
    print("Web Application UI: http://127.0.0.1:8000")
    print("\nPress Ctrl+C to stop the platform.")

    try:
        backend_process.wait()
    except KeyboardInterrupt:
        print("\nStopping platform...")
        backend_process.terminate()

if __name__ == "__main__":
    main()

