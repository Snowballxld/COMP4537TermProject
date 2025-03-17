console.log("YOOO");

  async function SignUp(event) {
    event.preventDefault();
    console.log("YOOOO");
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    console.log(username)
    // Hash the password using SHA-256
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
    }
    
    const hashedPassword = await hashPassword(password);
    console.log(hashedPassword)
    const requestData = {
        username: username,
        password: hashedPassword
    };

    // Send data to backend
    try {
        const response = await fetch("http://localhost:3000/api/signup", { // Change https to http
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
      });
  

        if (response.ok) {
            alert("Signup successful!");
        } else {
            alert("Signup failed. Please try again.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Please try again later.");
    }
}
