cd client
npm run build
cd ..
rm -rf server/static
cp -R client/dist server/static
