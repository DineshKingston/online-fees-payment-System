from flask import Flask, request, jsonify, render_template, send_from_directory
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__, static_url_path='')

# Mock database - in a real application, use a proper database
students = []
admins = []
fee_types = []
payments = []

# Load initial data
def load_mock_data():
    global students, admins, fee_types, payments
    # Creating some sample data
    students = [
        {
            "id": "S001",
            "password": "student123",
            "name": "John Doe",
            "email": "john.doe@example.com",
            "course": "Computer Science",
            "semester": 3,
            "fees": [
                {"id": 1, "name": "Tuition Fee", "amount": 5000, "semester": 3, "deadline": "2025-04-15", "status": "pending"},
                {"id": 2, "name": "Library Fee", "amount": 500, "semester": 3, "deadline": "2025-04-15", "status": "pending"},
                {"id": 3, "name": "Lab Fee", "amount": 1200, "semester": 3, "deadline": "2025-04-15", "status": "pending"}
            ]
        },
        {
            "id": "S002",
            "password": "student123",
            "name": "Jane Smith",
            "email": "jane.smith@example.com",
            "course": "Electrical Engineering",
            "semester": 4,
            "fees": [
                {"id": 5, "name": "Tuition Fee", "amount": 5500, "semester": 4, "deadline": "2025-04-15", "status": "pending"},
                {"id": 6, "name": "Library Fee", "amount": 500, "semester": 4, "deadline": "2025-04-15", "status": "pending"}
            ]
        }
    ]
    
    admins = [
        {
            "id": "admin",
            "password": "admin123",
            "name": "Admin User"
        }
    ]
    
    fee_types = [
        {"id": 1, "name": "Tuition Fee", "amount": 5000, "semester": 3, "deadline": "2025-04-15"},
        {"id": 2, "name": "Library Fee", "amount": 500, "semester": 3, "deadline": "2025-04-15"},
        {"id": 3, "name": "Lab Fee", "amount": 1200, "semester": 3, "deadline": "2025-04-15"},
        {"id": 4, "name": "Examination Fee", "amount": 800, "semester": 3, "deadline": "2025-04-15"}
    ]
    
    payments = [
        {"id": 1, "studentId": "S001", "feeId": 4, "amount": 800, "method": "credit-card", "status": "success", "date": "2024-11-30", "reference": "PAY123456"}
    ]

# Routes for static files
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('', path)

# API Routes
@app.route('/api/student/login', methods=['POST'])
def student_login():
    data = request.json
    student_id = data.get('studentId')
    password = data.get('password')
    
    for student in students:
        if student["id"] == student_id and student["password"] == password:
            # Don't send password in response
            return jsonify({
                "success": True,
                "student": {
                    "id": student["id"],
                    "name": student["name"],
                    "email": student["email"],
                    "course": student["course"],
                    "semester": student["semester"],
                    "fees": student["fees"]
                }
            })
    
    return jsonify({"success": False, "message": "Invalid credentials"})

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    admin_id = data.get('adminId')
    password = data.get('password')
    
    for admin in admins:
        if admin["id"] == admin_id and admin["password"] == password:
            return jsonify({
                "success": True,
                "admin": {
                    "id": admin["id"],
                    "name": admin["name"]
                }
            })
    
    return jsonify({"success": False, "message": "Invalid credentials"})

@app.route('/api/student/fees/<student_id>', methods=['GET'])
def get_student_fees(student_id):
    for student in students:
        if student["id"] == student_id:
            return jsonify({
                "success": True,
                "fees": student["fees"]
            })
    
    return jsonify({"success": False, "message": "Student not found"})

@app.route('/api/payment/process', methods=['POST'])
def process_payment():
    data = request.json
    student_id = data.get('studentId')
    fee_id = data.get('feeId')
    amount = data.get('amount')
    method = data.get('method')
    
    # Create payment record
    payment_id = len(payments) + 1
    reference = f"PAY{uuid.uuid4().hex[:6].upper()}"
    
    payment = {
        "id": payment_id,
        "studentId": student_id,
        "feeId": fee_id,
        "amount": amount,
        "method": method,
        "status": "success",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "reference": reference
    }
    
    payments.append(payment)
    
    # Update student fee status
    for student in students:
        if student["id"] == student_id:
            for fee in student["fees"]:
                if fee["id"] == fee_id:
                    fee["status"] = "paid"
                    fee["paymentDate"] = datetime.now().strftime("%Y-%m-%d")
                    break
            break
    
    return jsonify({
        "success": True,
        "payment": payment
    })

@app.route('/api/admin/students', methods=['GET'])
def get_students():
    # Return list without passwords
    safe_students = []
    for student in students:
        safe_student = student.copy()
        safe_student.pop('password', None)
        safe_students.append(safe_student)
        
    return jsonify({
        "success": True,
        "students": safe_students
    })

@app.route('/api/admin/students', methods=['POST'])
def add_student():
    data = request.json
    
    # Check if student ID already exists
    for student in students:
        if student["id"] == data.get("id"):
            return jsonify({"success": False, "message": "Student ID already exists"})
    
    # Create new student
    new_student = {
        "id": data.get("id"),
        "password": data.get("password"),
        "name": data.get("name"),
        "email": data.get("email"),
        "course": data.get("course"),
        "semester": data.get("semester", 1),
        "fees": []
    }
    
    students.append(new_student)
    
    return jsonify({
        "success": True,
        "student": {
            "id": new_student["id"],
            "name": new_student["name"],
            "email": new_student["email"],
            "course": new_student["course"],
            "semester": new_student["semester"]
        }
    })

@app.route('/api/admin/fees', methods=['GET'])
def get_fee_types():
    return jsonify({
        "success": True,
        "feeTypes": fee_types
    })

@app.route('/api/admin/fees', methods=['POST'])
def add_fee_type():
    data = request.json
    
    # Create new fee type
    new_fee = {
        "id": len(fee_types) + 1,
        "name": data.get("name"),
        "amount": data.get("amount"),
        "semester": data.get("semester"),
        "deadline": data.get("deadline")
    }
    
    fee_types.append(new_fee)
    
    return jsonify({
        "success": True,
        "feeType": new_fee
    })

@app.route('/api/admin/payments', methods=['GET'])
def get_payments():
    from_date = request.args.get('from')
    to_date = request.args.get('to')
    status = request.args.get('status')
    
    filtered_payments = payments.copy()
    
    if from_date:
        filtered_payments = [p for p in filtered_payments if p["date"] >= from_date]
    if to_date:
        filtered_payments = [p for p in filtered_payments if p["date"] <= to_date]
    if status and status != 'all':
        filtered_payments = [p for p in filtered_payments if p["status"] == status]
    
    return jsonify({
        "success": True,
        "payments": filtered_payments
    })

if __name__ == '__main__':
    load_mock_data()
    app.run(debug=True)