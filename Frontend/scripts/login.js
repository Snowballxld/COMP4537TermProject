if (sessionStorage.getItem("isLoggedIn") === "true") {
    window.location.href = "views/home.html";
}

async function login(event) {
  event.preventDefault(); // Prevent form from submitting

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Hash the password using the existing hashPassword function
  const hashedPassword = await hashPassword(password);

  const requestData = {
      email: email,
      password: hashedPassword,
  };

  try {
      // Send POST request to the backend
      const response = await fetch("http://localhost:3000/api/login", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
      });

      if (response.ok) {
         console.log("sigma");
         sessionStorage.setItem("isLoggedIn", "true");
         const temp = await response.json();
         console.log(temp.admin)
         if(temp.admin == "True"){
            window.location.href = "/views/admin.html";
         } else{
            window.location.href = "/views/home.html";
         }


          // If login is successful, send a GET request to retrieve user info
          const userInfo = await fetch("http://localhost:3000/api/user", {
              method: "GET",
              headers: {
                  "Content-Type": "application/json",
              },
          });
          const data = await userInfo.json();
          if (data.success) {
             console.log("data success");
              alert("Login successful! Welcome " + data.user.email);
              // Redirect user to another page, e.g., Dashboard
              
          }
      } else {
          // Handle login failure
          alert("Login failed. Please check your credentials and try again.");
      }
  } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again later.");
  }
}

// Hashing function you already have
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
}
