console.log('testing0')
const site = "https://web-translator-j7nv7.ondigitalocean.app";
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check if the user is an admin
        const userResponse = await fetch(`${site}/api/user`, { credentials: "include" });
        const userData = await userResponse.json();
        console.log("Full userData:", userData);
        console.log(userData.user.isAdmin)
        console.log(userData.success)



        if (!userData || !userData.user || userData.user.isAdmin == "false" || userData.user.isAdmin == "undefined") {
            console.log('ohio asl wth')
            alert("Error 403: You do not have permission to view this page.");
            window.location.href = "./home.html"; // Redirect non-admins
            return;
        }
        console.log('ohio 2')
        // Fetch list of users
        const usersResponse = await fetch(`${site}/api/admin/users`, { credentials: "include" });
        const usersData = await usersResponse.json();

        if (usersData.success) {
            displayUsers(usersData.users, usersData.apis);
        } else {
            alert("Failed to fetch users.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
});

function displayUsers(users, apis) {
    // Set up Users Table
    const usersList = document.getElementById("usersList");
    usersList.innerHTML = "";  // Clear current content

    let usersTableHTML = `
        <table>
            <tr>
                <th>Email</th>
                <th>API Calls</th>
                <th>Actions</th>
            </tr>
    `;

    // Add each user as a row in the table
    users.forEach(user => {
        usersTableHTML += `
            <tr>
                <td>${user.email}</td>
                <td>${user.apiUsage}</td>
                <td><button onclick="deleteUser('${user._id}')">Delete</button></td>
            </tr>
        `;
    });

    usersTableHTML += `</table>`;
    usersList.innerHTML = usersTableHTML; // Insert the table HTML into the page

    // Set up APIs Table
    const apiList = document.getElementById("apiList");
    apiList.innerHTML = "";  // Clear current content

    let apiTableHTML = `
        <table>
            <tr>
                <th>API</th>
                <th>Method</th>
                <th>Count</th>
            </tr>
    `;

    // Add each API as a row in the table
    apis.forEach(api => {
        apiTableHTML += `
            <tr>
                <td>${api.api}</td>
                <td>${api.method}</td>
                <td>${api.count}</td>
            </tr>
        `;
    });

    apiTableHTML += `</table>`;
    apiList.innerHTML = apiTableHTML; // Insert the table HTML into the page
}


// Function to delete a user
async function deleteUser(userId) {
    try {
        const response = await fetch(`${site}/api/admin/delete/${userId}`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await response.json();
        if (data.success) {
            alert("User deleted successfully.");
            location.reload(); // Refresh the list
        } else {
            alert("Failed to delete user.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
