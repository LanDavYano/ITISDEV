function applyPermissions(role) {
    const addMemberBtn = document.getElementById('add-member-btn');
    const broadcastBtn = document.getElementById('broadcast-btn');
    const adminOnlyButtons = document.querySelectorAll('.admin-only'); 
    
    document.getElementById('current-user-name').textContent = role === 'Admin' ? 'Admin User' : 'Standard Member';
    document.getElementById('current-user-dept').textContent = role === 'Admin' ? 'Performance Management' : 'Local Committee';

    if (role === 'Member') {
        addMemberBtn.classList.add('restricted');
        broadcastBtn.classList.add('restricted');
        adminOnlyButtons.forEach(btn => {
            btn.classList.add('disabled-btn');
            btn.title = "Restricted: Admin Access Required";
        });
    } else {
        addMemberBtn.classList.remove('restricted');
        broadcastBtn.classList.remove('restricted');
        adminOnlyButtons.forEach(btn => {
            btn.classList.remove('disabled-btn');
            btn.title = btn.classList.contains('delete-btn') ? "Delete Account" : "Edit Account";
        });
    }
}

function deleteAccount(buttonElement) {
    const isConfirmed = confirm("Are you sure you want to remove this member from the LC portal? This action cannot be undone.");
    if (isConfirmed) {
        const row = buttonElement.closest('.table-row');
        row.style.opacity = '0.5';
        setTimeout(() => {
            row.remove();
            alert("Member successfully removed.");
        }, 300);
    }
}

function confirmLogout() {
    if(confirm("Are you sure you want to log out of the PM Portal?")) {
        alert("You have been successfully logged out.");
        document.body.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;'><h1>Logged Out</h1></div>";
    }
}

function setDynamicDeadlines() {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const endString = endOfMonth.toLocaleDateString('en-US', options);
    const startString = startOfNextMonth.toLocaleDateString('en-US', options);

    document.querySelectorAll('.end-of-month-date').forEach(el => { el.textContent = endString; });
    document.querySelectorAll('.start-of-month-date').forEach(el => { el.textContent = startString; });
}

window.onload = function() {
    setDynamicDeadlines();
    applyPermissions('Admin');
};