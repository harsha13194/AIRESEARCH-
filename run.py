import os
import sys
import subprocess

def check_and_install_dependencies():
    print("Checking dependencies...")
    required_packages = ["fastapi", "uvicorn", "requests", "beautifulsoup4"]
    missing_packages = []
    
    # Try importing each package
    for pkg in required_packages:
        try:
            if pkg == "beautifulsoup4":
                import bs4
            else:
                __import__(pkg)
        except ImportError:
            missing_packages.append(pkg)
            
    if missing_packages:
        print(f"Missing packages: {', '.join(missing_packages)}")
        print("Installing dependencies from requirements.txt...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("Dependencies installed successfully!")
        except Exception as e:
            print(f"Error installing dependencies: {e}")
            print("Trying to install missing packages individually...")
            for pkg in missing_packages:
                try:
                    subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])
                except Exception as ex:
                    print(f"Could not install {pkg}: {ex}")
    else:
        print("All dependencies are already installed.")

if __name__ == "__main__":
    # Ensure current directory is in python path
    sys.path.append(os.path.abspath(os.path.dirname(__file__)))
    
    # Auto install missing libraries
    check_and_install_dependencies()
    
    # Launch Uvicorn server
    print("\nStarting the Personal Researcher Web Application...")
    print("Please open your browser to http://localhost:8000\n")
    
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
