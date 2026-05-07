#!/usr/bin/env python3
"""
Test script for User Management Service
Run: python test_user_management.py
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import time

# ============================================================================
# CONFIGURATION - PASTE YOUR JWT TOKEN HERE
# ============================================================================

# PASTE YOUR ADMIN JWT TOKEN BETWEEN THE QUOTES BELOW:
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicGFpZCI6dHJ1ZSwiYWRtaW4iOnRydWUsImNvbnRlbnRfaGFuZGxlciI6dHJ1ZSwiZXhwIjoxNzU2MjczNjU2LCJ0eXBlIjoiYWNjZXNzIn0.lrR6hoPghfy19d8ztYa5b0pfv10hXx4TDqcOau0cRrQ"

# Service URL
BASE_URL = "https://33a57c2e7a0f.ngrok-free.app/ususarios"

# ============================================================================
# TEST UTILITIES
# ============================================================================

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_test_header(test_name: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}TEST: {test_name}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_result(success: bool, message: str):
    if success:
        print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")
    else:
        print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

def print_response(response: requests.Response, show_body: bool = True):
    print(f"\n{Colors.OKCYAN}Status Code: {response.status_code}{Colors.ENDC}")
    if show_body:
        try:
            body = response.json()
            print(f"{Colors.OKBLUE}Response Body:{Colors.ENDC}")
            print(json.dumps(body, indent=2, default=str))
        except:
            print(f"{Colors.WARNING}Response Text: {response.text}{Colors.ENDC}")

def get_headers():
    """Get headers with JWT token"""
    return {
        "Authorization": f"Bearer {JWT_TOKEN}",
        "Content-Type": "application/json"
    }

# ============================================================================
# TEST FUNCTIONS
# ============================================================================

def test_health_check():
    """Test health check endpoint (no auth required)"""
    print_test_header("Health Check")
    
    response = requests.get(f"{BASE_URL}/health")
    print_response(response)
    
    success = response.status_code == 200
    print_result(success, "Health check endpoint accessible")
    return success

def test_list_users():
    """Test listing users with various filters"""
    print_test_header("List Users")
    
    tests = [
        {
            "name": "List all users (default)",
            "params": {}
        },
        {
            "name": "List with limit and offset",
            "params": {"limit": 5, "offset": 0}
        },
        {
            "name": "Search by query",
            "params": {"query": "admin"}
        },
        {
            "name": "Filter by active status",
            "params": {"is_active": True}
        },
        {
            "name": "Filter by admin role",
            "params": {"is_admin": True}
        },
        {
            "name": "Filter by paid status",
            "params": {"is_paid": True}
        },
        {
            "name": "Order by username ascending",
            "params": {"order_by": "username", "order_dir": "ASC"}
        },
        {
            "name": "Filter by failed login attempts",
            "params": {"failed_login_min": 3}
        }
    ]
    
    all_success = True
    for test in tests:
        print(f"\n{Colors.WARNING}Testing: {test['name']}{Colors.ENDC}")
        response = requests.get(
            f"{BASE_URL}/users/list",
            params=test["params"],
            headers=get_headers()
        )
        print_response(response, show_body=test["params"] == {})  # Show full body only for first test
        
        success = response.status_code == 200
        print_result(success, test["name"])
        all_success = all_success and success
        
        if success and test["params"] == {}:
            # Store a user_id for later tests
            data = response.json()
            if data["items"]:
                global TEST_USER_ID
                TEST_USER_ID = data["items"][0]["id"]
                print(f"{Colors.OKGREEN}Stored user_id {TEST_USER_ID} for subsequent tests{Colors.ENDC}")
    
    return all_success

def test_user_counters():
    """Test user counters endpoint"""
    print_test_header("User Counters")
    
    tests = [
        {"name": "Default counters", "params": {}},
        {"name": "Counters with failed_login_min=10", "params": {"failed_login_min": 10}}
    ]
    
    all_success = True
    for test in tests:
        print(f"\n{Colors.WARNING}Testing: {test['name']}{Colors.ENDC}")
        response = requests.get(
            f"{BASE_URL}/users/counters",
            params=test["params"],
            headers=get_headers()
        )
        print_response(response)
        
        success = response.status_code == 200
        print_result(success, test["name"])
        all_success = all_success and success
    
    return all_success

def test_user_detail():
    """Test user detail endpoint"""
    print_test_header("User Detail")
    
    if not TEST_USER_ID:
        print(f"{Colors.FAIL}No user_id available for testing{Colors.ENDC}")
        return False
    
    response = requests.get(
        f"{BASE_URL}/users/{TEST_USER_ID}/detail",
        headers=get_headers()
    )
    print_response(response)
    
    success = response.status_code == 200
    print_result(success, f"Retrieved detail for user_id {TEST_USER_ID}")
    
    # Test with non-existent user
    print(f"\n{Colors.WARNING}Testing with non-existent user{Colors.ENDC}")
    response = requests.get(
        f"{BASE_URL}/users/999999/detail",
        headers=get_headers()
    )
    print_response(response)
    
    not_found = response.status_code == 404
    print_result(not_found, "Correctly returns 404 for non-existent user")
    
    return success and not_found

def test_set_user_flags():
    """Test setting various user flags"""
    print_test_header("Set User Flags")
    
    if not TEST_USER_ID:
        print(f"{Colors.FAIL}No user_id available for testing{Colors.ENDC}")
        return False
    
    # Store original state
    response = requests.get(
        f"{BASE_URL}/users/{TEST_USER_ID}/detail",
        headers=get_headers()
    )
    original_state = response.json() if response.status_code == 200 else {}
    
    tests = [
        {
            "name": "Set active to false",
            "endpoint": f"/users/{TEST_USER_ID}/active",
            "body": {"is_active": False}
        },
        {
            "name": "Set active to true",
            "endpoint": f"/users/{TEST_USER_ID}/active",
            "body": {"is_active": True}
        },
        {
            "name": "Set verified to true",
            "endpoint": f"/users/{TEST_USER_ID}/verified",
            "body": {"is_verified": True}
        },
        {
            "name": "Set paid to true",
            "endpoint": f"/users/{TEST_USER_ID}/paid",
            "body": {"is_paid": True}
        },
        {
            "name": "Set content handler to true",
            "endpoint": f"/users/{TEST_USER_ID}/content-handler",
            "body": {"is_content_handler": True}
        },
        {
            "name": "Set content handler to false",
            "endpoint": f"/users/{TEST_USER_ID}/content-handler",
            "body": {"is_content_handler": False}
        }
    ]
    
    all_success = True
    for test in tests:
        print(f"\n{Colors.WARNING}Testing: {test['name']}{Colors.ENDC}")
        response = requests.put(
            f"{BASE_URL}{test['endpoint']}",
            json=test["body"],
            headers=get_headers()
        )
        print_response(response)
        
        success = response.status_code == 200
        print_result(success, test["name"])
        all_success = all_success and success
        
        # Small delay to avoid overwhelming the server
        time.sleep(0.1)
    
    # Restore original flags (cleanup)
    if original_state:
        print(f"\n{Colors.WARNING}Restoring original state...{Colors.ENDC}")
        if "is_verified" in original_state:
            requests.put(
                f"{BASE_URL}/users/{TEST_USER_ID}/verified",
                json={"is_verified": original_state["is_verified"]},
                headers=get_headers()
            )
        if "is_paid" in original_state:
            requests.put(
                f"{BASE_URL}/users/{TEST_USER_ID}/paid",
                json={"is_paid": original_state["is_paid"]},
                headers=get_headers()
            )
        if "is_content_handler" in original_state:
            requests.put(
                f"{BASE_URL}/users/{TEST_USER_ID}/content-handler",
                json={"is_content_handler": original_state["is_content_handler"]},
                headers=get_headers()
            )
    
    return all_success

def test_admin_role_safeguard():
    """Test admin role safeguard (prevent removing last admin)"""
    print_test_header("Admin Role Safeguard")
    
    # First, find all admin users
    response = requests.get(
        f"{BASE_URL}/users/list",
        params={"is_admin": True},
        headers=get_headers()
    )
    
    if response.status_code != 200:
        print(f"{Colors.FAIL}Could not retrieve admin users{Colors.ENDC}")
        return False
    
    admins = response.json()["items"]
    print(f"{Colors.OKBLUE}Found {len(admins)} admin(s){Colors.ENDC}")
    
    if len(admins) == 1:
        # Try to remove admin role from the last admin (should fail)
        admin_id = admins[0]["id"]
        print(f"\n{Colors.WARNING}Attempting to remove admin role from last admin (ID: {admin_id}){Colors.ENDC}")
        
        response = requests.put(
            f"{BASE_URL}/users/{admin_id}/admin",
            json={"is_admin": False},
            headers=get_headers()
        )
        print_response(response)
        
        # This should fail with 400
        success = response.status_code == 400
        print_result(success, "Safeguard correctly prevented removing last admin")
        return success
    
    elif len(admins) > 1:
        # Test normal admin role toggle
        non_primary_admin = admins[1]["id"]
        print(f"\n{Colors.WARNING}Testing normal admin role toggle (ID: {non_primary_admin}){Colors.ENDC}")
        
        # Remove admin
        response = requests.put(
            f"{BASE_URL}/users/{non_primary_admin}/admin",
            json={"is_admin": False},
            headers=get_headers()
        )
        print_response(response)
        remove_success = response.status_code == 200
        print_result(remove_success, "Successfully removed admin role")
        
        # Restore admin
        response = requests.put(
            f"{BASE_URL}/users/{non_primary_admin}/admin",
            json={"is_admin": True},
            headers=get_headers()
        )
        restore_success = response.status_code == 200
        print_result(restore_success, "Successfully restored admin role")
        
        return remove_success and restore_success
    
    else:
        print(f"{Colors.WARNING}No admins found - cannot test safeguard{Colors.ENDC}")
        return False

def test_unauthorized_access():
    """Test that endpoints require proper authentication"""
    print_test_header("Authentication Required")
    
    # Test without token
    print(f"\n{Colors.WARNING}Testing without JWT token{Colors.ENDC}")
    response = requests.get(f"{BASE_URL}/users/list")
    print(f"Status Code: {response.status_code}")
    
    unauthorized = response.status_code == 401
    print_result(unauthorized, "Correctly returns 401 without authentication")
    
    # Test with invalid token
    print(f"\n{Colors.WARNING}Testing with invalid JWT token{Colors.ENDC}")
    headers = {"Authorization": "Bearer invalid_token_12345"}
    response = requests.get(f"{BASE_URL}/users/list", headers=headers)
    print(f"Status Code: {response.status_code}")
    
    invalid_unauthorized = response.status_code == 401
    print_result(invalid_unauthorized, "Correctly returns 401 with invalid token")
    
    return unauthorized and invalid_unauthorized

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

TEST_USER_ID = None

def main():
    print(f"{Colors.BOLD}{Colors.HEADER}")
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "USER MANAGEMENT SERVICE TEST SUITE" + " " * 13 + "║")
    print("╚" + "═" * 58 + "╝")
    print(f"{Colors.ENDC}")
    
    print(f"{Colors.OKCYAN}Service URL: {BASE_URL}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}JWT Token: {'[SET]' if JWT_TOKEN != 'YOUR_JWT_TOKEN_HERE' else '[NOT SET]'}{Colors.ENDC}")
    
    if JWT_TOKEN == "YOUR_JWT_TOKEN_HERE":
        print(f"\n{Colors.FAIL}ERROR: Please paste your JWT token in the JWT_TOKEN variable at the top of this script{Colors.ENDC}")
        return
    
    # Run all tests
    tests = [
        ("Health Check", test_health_check),
        ("List Users", test_list_users),
        ("User Counters", test_user_counters),
        ("User Detail", test_user_detail),
        ("Set User Flags", test_set_user_flags),
        ("Admin Role Safeguard", test_admin_role_safeguard),
        ("Authentication Required", test_unauthorized_access),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"{Colors.FAIL}Error in {test_name}: {e}{Colors.ENDC}")
            results.append((test_name, False))
    
    # Print summary
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}TEST SUMMARY{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.ENDC}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = f"{Colors.OKGREEN}PASSED{Colors.ENDC}" if success else f"{Colors.FAIL}FAILED{Colors.ENDC}"
        print(f"{test_name}: {status}")
    
    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.ENDC}")
    
    if passed == total:
        print(f"{Colors.OKGREEN}{Colors.BOLD}✓ ALL TESTS PASSED!{Colors.ENDC}")
    else:
        print(f"{Colors.FAIL}{Colors.BOLD}✗ SOME TESTS FAILED{Colors.ENDC}")

if __name__ == "__main__":
    main()