const path = require("path");
const express = require("express");
const router = express.Router();
const User = require("./user");
const bcrypt = require("bcrypt");

// // GET: Display login form (static HTML)
// router.get("/", (req, res) => {
//   if (req.session.isLoggedIn) {
//     return res.redirect('/home');
//   }
//   // Adjust the path if needed, depending on your project structure.
//   res.sendFile(path.join(__dirname, '../../Frontend/views', 'login.html'));
// });

// POST: Handle login
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Save user information in session
    req.session.userId = user._id;
    req.session.email = user.email;
    req.session.isLoggedIn = true;

      res.json({ message: "Login successful", isLoggedIn: true });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "An error occurred during login" });
    }
});

module.exports = router;
