# Loan Management System API Automation

This repository contains the automated API testing for the Loan Management System using **Postman** and **Newman**.


## Checkout the Postman  collection on:  

 https://www.postman.com/satellite-explorer-26450683/workspace/api-testing/collection/31394698-13a8cb45-c734-4746-908b-2bddaeba6697?action=share&creator=31394698&active-environment=31394698-2ef29875-2363-4324-bae9-a142d567e27b


## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup and Configuration](#setup-and-configuration)
4. [Running Tests](#running-tests)
5. [Test Reports](#test-reports)
6. [Contributing](#contributing)
7. [License](#license)

## Overview
The Loan Management System (LMS) is designed to manage loan applications, client payments, and notifications. The tests here validate core features such as:

- **Loan Management**: Update loan details, approve loans.
- **Client Management**: Contact clients, view client payments.
- **Payments Management**: Track payments and balance updates.

### Features Tested
- Loan creation and updates
- Client registration and payments
- Payment processing and notifications

## Prerequisites
Before running the tests, ensure you have the following:

- **Node.js** installed. You can download it from [Node.js Official Site](https://nodejs.org/).
- **Newman** (Postman’s CLI tool) installed globally:
  ```bash
  npm install -g newman

Postman: Use Postman for managing and running API collections. Download from Postman Official Site.

## Configure Environment Variables
In Postman, open the Environment tab.

Ensure environment variables like {{base_url}}, {{password}}, {{client_id}}, {{loan_id }}, are correctly defined in the QA-lending-env.postman_environment.json file.

## Running tests
To run the automated API tests with Newman using the collection and environment:

- Navigate to the directory where the lending app testing.postman_collection.json and QA-lending-env.postman_environment.json are located.

- Run the following command:

```
newman run 'lending app testing.postman_collection.json' -e QA-lending-env.postman_environment.json
```

This command will execute all the tests in the Postman collection using the provided environment.

## Generate Test Reports
```
newman run 'lending app testing.postman_collection.json' \
  -e QA-lending-env.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export report.html
  ```
