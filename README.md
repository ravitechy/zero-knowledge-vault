# Zero-knowledge-vault
Full stack application for zero knowledge vault management

__The purpose of this application is to store the sensitive information like username, passwords, MPINs etc. for any number of sites/targets (gmail, hdfc bank etc.) safely without any leakage and without having to store the master password for them__

# How to run the backend server
1. Open the module zero-knowledge-vault-manager within this repo
2. Run the file build-and-run-no-docker.bat on Windows OS or use the file build-and-run-no-docker.sh for Linux
3. If you want to run this as a docker container then use either of these files -> build-and-run.bat or build-and-run.sh
4. Feel free to modify the configurations like the server port or the spring profile according to your requirement

# How to run the frontend UI
1. Open the module vault-ui within this repo
2. Open the terminal from this directory and run the command 'npm run dev -- --host'
3. Open the browser and go to https://localhost:5173/
