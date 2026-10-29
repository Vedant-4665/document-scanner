"""Start the development server:  python run.py"""

from scanner.app import create_app

app = create_app()

if __name__ == "__main__":
    # Port 5001, because macOS uses port 5000 for AirPlay Receiver.
    # 127.0.0.1 means only this computer can reach Flask directly; phones
    # reach it through the Vite dev server's /api proxy instead.
    app.run(host="127.0.0.1", port=5001, debug=True)
