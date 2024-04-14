const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5500;

app.use(express.static(path.join(__dirname, 'dist')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "page.html"))
})

app.get("/renderer/shaders/:shader", (req, res) => {
  res.sendFile(path.join(__dirname, "src/renderer/shaders/", req.params.shader))
})

app.listen(PORT, () => {
  console.log(`Server is up and running on port ${PORT}`);
});
