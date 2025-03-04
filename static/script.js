// Global variables
let currentUser = null;
let currentTab = 'student';
let currentAdminTab = 'students';

// Helper function for API requests
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    return response.json();
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('student-login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('admin-login-form').addEventListener('submit', handleAdminLogin);
    document.getElementById('payment-form').addEventListener('submit', handlePayment);
    document.getElementById('fee-type').addEventListener('change', updatePaymentAmount);
    document.getElementById('payment-method').addEventListener('change', showPaymentDetails);
    document.getElementById('new-student-form').addEventListener('submit', handleAddStudent);
    document.getElementById('new-fee-form').addEventListener('submit', handleAddFee);
});

// Student Login
async function handleStudentLogin(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('student-id').value;
    const password = document.getElementById('student-password').value;
    
    try {
        const response = await apiRequest('/api/student/login', 'POST', { studentId, password });
        
        if (response.success) {
            currentUser = { type: 'student', data: response.student };
            document.getElementById('login-container').classList.add('hidden');
            document.getElementById('student-dashboard').classList.remove('hidden');
            loadStudentDashboard();
        } else {
            document.getElementById('student-error').textContent = response.message || 'Invalid student ID or password.';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('student-error').textContent = 'Error connecting to server.';
    }
}

// Admin Login
async function handleAdminLogin(event) {
    event.preventDefault();
    
    const adminId = document.getElementById('admin-id').value;
    const password = document.getElementById('admin-password').value;
    
    try {
        const response = await apiRequest('/api/admin/login', 'POST', { adminId, password });
        
        if (response.success) {
            currentUser = { type: 'admin', data: response.admin };
            document.getElementById('login-container').classList.add('hidden');
            document.getElementById('admin-dashboard').classList.remove('hidden');
            loadAdminDashboard();
        } else {
            document.getElementById('admin-error').textContent = response.message || 'Invalid admin ID or password.';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('admin-error').textContent = 'Error connecting to server.';
    }
}

// Logout function
function logout() {
    currentUser = null;
    document.getElementById('student-dashboard').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('student-id').value = '';
    document.getElementById('student-password').value = '';
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('student-error').textContent = '';
    document.getElementById('admin-error').textContent = '';
}

// Tab switching
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.form-container').forEach(form => form.classList.remove('active'));
    document.getElementById(`${tab}-form`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function switchAdminTab(tab) {
    currentAdminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(adminTab => adminTab.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
    document.querySelectorAll('.admin-controls .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    if (tab === 'students') loadStudentsList();
    else if (tab === 'fees') loadFeeTypesList();
    else if (tab === 'payments') loadPaymentRecords();
}

// Load student dashboard
async function loadStudentDashboard() {
    if (!currentUser || currentUser.type !== 'student') return;
    const student = currentUser.data;
    document.getElementById('student-details').innerHTML = `
        <div>
            <p><strong>Student ID:</strong> ${student.id}</p>
            <p><strong>Name:</strong> ${student.name}</p>
        </div>
        <div>
            <p><strong>Email:</strong> ${student.email}</p>
            <p><strong>Course:</strong> ${student.course}</p>
            <p><strong>Current Semester:</strong> ${student.semester}</p>
        </div>
    `;
    
    // Load student fees
    try {
        const response = await apiRequest(`/api/student/fees/${student.id}`);
        if (response.success) {
            displayStudentFees(response.fees);
            populatePaymentForm(response.fees);
        }
    } catch (error) {
        console.error('Error loading fees:', error);
    }
}

// Display student fees
function displayStudentFees(fees) {
    const pendingFeesContainer = document.getElementById('pending-fees');
    const paymentHistoryContainer = document.getElementById('payment-history');
    
    // Clear containers
    pendingFeesContainer.innerHTML = '';
    paymentHistoryContainer.innerHTML = '<h4>Payment History</h4>';
    
    let pendingFeesHTML = '';
    let paidFeesHTML = '';
    
    fees.forEach(fee => {
        const deadlineDate = new Date(fee.deadline);
        const isOverdue = fee.status === 'pending' && deadlineDate < new Date();
        const statusClass = fee.status === 'paid' ? 'paid' : (isOverdue ? 'overdue' : 'pending');
        const statusText = fee.status === 'paid' ? 'Paid' : (isOverdue ? 'Overdue' : 'Pending');
        
        const feeItemHTML = `
            <div class="fee-item">
                <div class="fee-details">
                    <span><strong>${fee.name}</strong></span>
                    <span>Amount: $${fee.amount.toFixed(2)}</span>
                    <span>Deadline: ${new Date(fee.deadline).toLocaleDateString()}</span>
                    ${fee.paymentDate ? `<span>Paid on: ${new Date(fee.paymentDate).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="fee-status ${statusClass}">${statusText}</div>
            </div>
        `;
        
        if (fee.status === 'paid') {
            paidFeesHTML += feeItemHTML;
        } else {
            pendingFeesHTML += feeItemHTML;
        }
    });
    
    pendingFeesContainer.innerHTML = pendingFeesHTML || '<p>No pending fees.</p>';
    if (paidFeesHTML) {
        paymentHistoryContainer.innerHTML += paidFeesHTML;
    } else {
        paymentHistoryContainer.innerHTML += '<p>No payment history available.</p>';
    }
}

// Populate payment form with fee options
function populatePaymentForm(fees) {
    const feeTypeSelect = document.getElementById('fee-type');
    
    // Clear existing options
    while (feeTypeSelect.options.length > 1) {
        feeTypeSelect.remove(1);
    }
    
    // Add pending fees as options
    fees.filter(fee => fee.status === 'pending').forEach(fee => {
        const option = document.createElement('option');
        option.value = fee.id;
        option.textContent = `${fee.name} - $${fee.amount.toFixed(2)}`;
        option.dataset.amount = fee.amount;
        feeTypeSelect.appendChild(option);
    });
}

// Update payment amount based on selected fee
function updatePaymentAmount() {
    const feeTypeSelect = document.getElementById('fee-type');
    const amountInput = document.getElementById('amount');
    
    if (feeTypeSelect.selectedIndex > 0) {
        const selectedOption = feeTypeSelect.options[feeTypeSelect.selectedIndex];
        amountInput.value = selectedOption.dataset.amount;
    } else {
        amountInput.value = '';
    }
}

// Show payment details based on payment method
function showPaymentDetails() {
    const paymentMethod = document.getElementById('payment-method').value;
    const paymentDetailsContainer = document.getElementById('payment-details');
    
    if (!paymentMethod) {
        paymentDetailsContainer.innerHTML = '';
        return;
    }
    
    let detailsHTML = '';
    
    switch (paymentMethod) {
        case 'credit-card':
        case 'debit-card':
            detailsHTML = `
                <div class="input-group">
                    <label for="card-number">Card Number</label>
                    <input type="text" id="card-number" placeholder="1234 5678 9012 3456" required>
                </div>
                <div class="input-group">
                    <label for="card-name">Name on Card</label>
                    <input type="text" id="card-name" required>
                </div>
                <div class="row">
                    <div class="input-group">
                        <label for="card-expiry">Expiry Date</label>
                        <input type="text" id="card-expiry" placeholder="MM/YY" required>
                    </div>
                    <div class="input-group">
                        <label for="card-cvv">CVV</label>
                        <input type="text" id="card-cvv" placeholder="123" required>
                    </div>
                </div>
            `;
            break;
        case 'net-banking':
            detailsHTML = `
                <div class="input-group">
                    <label for="bank-name">Select Bank</label>
                    <select id="bank-name" required>
                        <option value="">Select Bank</option>
                        <option value="bank1">Bank 1</option>
                        <option value="bank2">Bank 2</option>
                        <option value="bank3">Bank 3</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="account-number">Account Number</label>
                    <input type="text" id="account-number" required>
                </div>
            `;
            break;
        case 'upi':
            detailsHTML = `
                <div class="input-group">
                    <label for="upi-id">UPI ID</label>
                    <input type="text" id="upi-id" placeholder="yourname@bankid" required>
                </div>
            `;
            break;
    }
    
    paymentDetailsContainer.innerHTML = detailsHTML;
}

// Handle payment submission
async function handlePayment(event) {
    event.preventDefault();
    
    const feeId = parseInt(document.getElementById('fee-type').value);
    const amount = parseFloat(document.getElementById('amount').value);
    const method = document.getElementById('payment-method').value;
    
    if (!feeId || !amount || !method) {
        alert('Please fill all the required fields.');
        return;
    }
    
    try {
        const response = await apiRequest('/api/payment/process', 'POST', {
            studentId: currentUser.data.id,
            feeId,
            amount,
            method
        });
        
        if (response.success) {
            alert(`Payment Successful! Reference: ${response.payment.reference}`);
            loadStudentDashboard(); // Reload the dashboard to show updated fees
        } else {
            alert(response.message || 'Payment failed. Please try again.');
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('Error processing payment. Please try again.');
    }
}

// Admin Functions

// Load admin dashboard
function loadAdminDashboard() {
    if (!currentUser || currentUser.type !== 'admin') return;
    
    // Load initial data for the first tab (students)
    loadStudentsList();
}

// Load students list for admin
async function loadStudentsList() {
    try {
        const response = await apiRequest('/api/admin/students');
        
        if (response.success) {
            displayStudentsList(response.students);
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Display students list
function displayStudentsList(students) {
    const studentsListContainer = document.getElementById('student-list');
    
    if (!students.length) {
        studentsListContainer.innerHTML = '<p>No students found.</p>';
        return;
    }
    
    let html = '';
    
    students.forEach(student => {
        html += `
            <div class="student-item" data-id="${student.id}">
                <div class="student-info-admin">
                    <h4>${student.name}</h4>
                    <p><strong>ID:</strong> ${student.id}</p>
                    <p><strong>Email:</strong> ${student.email}</p>
                    <p><strong>Course:</strong> ${student.course}</p>
                    <p><strong>Semester:</strong> ${student.semester}</p>
                </div>
                <div class="student-actions">
                    <button class="btn-view" onclick="viewStudentFees('${student.id}')">View Fees</button>
                </div>
            </div>
        `;
    });
    
    studentsListContainer.innerHTML = html;
}

// View student fees for admin
async function viewStudentFees(studentId) {
    try {
        const response = await apiRequest(`/api/student/fees/${studentId}`);
        
        if (response.success) {
            // Display fees in a modal or separate section
            alert(`Fees for Student ID ${studentId}:\n${JSON.stringify(response.fees, null, 2)}`);
        }
    } catch (error) {
        console.error('Error loading student fees:', error);
    }
}

// Show add student form
function showAddStudentForm() {
    document.getElementById('add-student-form').classList.remove('hidden');
}

// Hide add student form
function hideAddStudentForm() {
    document.getElementById('add-student-form').classList.add('hidden');
    document.getElementById('new-student-form').reset();
}

// Handle add student
async function handleAddStudent(event) {
    event.preventDefault();
    
    const newStudent = {
        id: document.getElementById('new-student-id').value,
        name: document.getElementById('new-student-name').value,
        email: document.getElementById('new-student-email').value,
        course: document.getElementById('new-student-course').value,
        password: document.getElementById('new-student-password').value,
        semester: 1 // Default semester
    };
    
    try {
        const response = await apiRequest('/api/admin/students', 'POST', newStudent);
        
        if (response.success) {
            alert('Student added successfully!');
            hideAddStudentForm();
            loadStudentsList(); // Reload the students list
        } else {
            alert(response.message || 'Failed to add student.');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        alert('Error adding student. Please try again.');
    }
}

// Load fee types list
async function loadFeeTypesList() {
    try {
        const response = await apiRequest('/api/admin/fees');
        
        if (response.success) {
            displayFeeTypesList(response.feeTypes);
        }
    } catch (error) {
        console.error('Error loading fee types:', error);
    }
}

// Display fee types list
function displayFeeTypesList(feeTypes) {
    const feeTypesListContainer = document.getElementById('fee-types-list');
    
    if (!feeTypes.length) {
        feeTypesListContainer.innerHTML = '<p>No fee types found.</p>';
        return;
    }
    
    let html = '';
    
    feeTypes.forEach(fee => {
        html += `
            <div class="fee-type-item">
                <div class="fee-info">
                    <h4>${fee.name}</h4>
                    <p><strong>Amount:</strong> $${fee.amount.toFixed(2)}</p>
                    <p><strong>Semester:</strong> ${fee.semester}</p>
                    <p><strong>Deadline:</strong> ${new Date(fee.deadline).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    });
    
    feeTypesListContainer.innerHTML = html;
}

// Show add fee form
function showAddFeeForm() {
    document.getElementById('add-fee-form').classList.remove('hidden');
}

// Hide add fee form
function hideAddFeeForm() {
    document.getElementById('add-fee-form').classList.add('hidden');
    document.getElementById('new-fee-form').reset();
}

// Handle add fee
async function handleAddFee(event) {
    event.preventDefault();
    
    const newFee = {
        name: document.getElementById('fee-name').value,
        amount: parseFloat(document.getElementById('fee-amount').value),
        semester: parseInt(document.getElementById('fee-semester').value),
        deadline: document.getElementById('fee-deadline').value
    };
    
    try {
        const response = await apiRequest('/api/admin/fees', 'POST', newFee);
        
        if (response.success) {
            alert('Fee type added successfully!');
            hideAddFeeForm();
            loadFeeTypesList(); // Reload the fee types list
        } else {
            alert(response.message || 'Failed to add fee type.');
        }
    } catch (error) {
        console.error('Error adding fee type:', error);
        alert('Error adding fee type. Please try again.');
    }
}

// Load payment records
async function loadPaymentRecords() {
    try {
        // Get filter values
        const fromDate = document.getElementById('filter-date-from').value;
        const toDate = document.getElementById('filter-date-to').value;
        const status = document.getElementById('filter-status').value;
        
        // Build query string
        let queryParams = [];
        if (fromDate) queryParams.push(`from=${fromDate}`);
        if (toDate) queryParams.push(`to=${toDate}`);
        if (status) queryParams.push(`status=${status}`);
        
        const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
        
        const response = await apiRequest(`/api/admin/payments${queryString}`);
        
        if (response.success) {
            displayPaymentRecords(response.payments);
        }
    } catch (error) {
        console.error('Error loading payment records:', error);
    }
}

// Display payment records
function displayPaymentRecords(payments) {
    const paymentRecordsContainer = document.getElementById('payment-records');
    
    if (!payments.length) {
        paymentRecordsContainer.innerHTML = '<p>No payment records found.</p>';
        return;
    }
    
    let html = '';
    
    payments.forEach(payment => {
        html += `
            <div class="payment-item">
                <div class="payment-info">
                    <h4>Payment #${payment.id} - ${payment.reference}</h4>
                    <p><strong>Student ID:</strong> ${payment.studentId}</p>
                    <p><strong>Amount:</strong> $${payment.amount.toFixed(2)}</p>
                    <p><strong>Method:</strong> ${payment.method}</p>
                    <p><strong>Date:</strong> ${new Date(payment.date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${payment.status}</p>
                </div>
            </div>
        `;
    });
    
    paymentRecordsContainer.innerHTML = html;
}

// Filter payments
function filterPayments() {
    loadPaymentRecords();
}

// Reset filters
function resetFilters() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-status').value = 'all';
    loadPaymentRecords();
}

// Search students
function searchStudents() {
    const searchTerm = document.getElementById('student-search').value.toLowerCase();
    
    if (!searchTerm) {
        loadStudentsList();
        return;
    }
    
    const studentItems = document.querySelectorAll('.student-item');
    
    studentItems.forEach(item => {
        const studentName = item.querySelector('h4').textContent.toLowerCase();
        const studentId = item.dataset.id.toLowerCase();
        
        if (studentName.includes(searchTerm) || studentId.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}