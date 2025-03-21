# AVR App

AdminJS application for agentvoiceresponse.com - an advanced IVR solution that integrates with AI, providing a voicebot interface through Asterisk's AudioSocket application.

## Overview

AVR App is a comprehensive administration panel for AI Agents. It provides a user-friendly interface for configuring an AI Agent to use ASR, LLM, and TTS external services in real-time.

## Features

- Web-based AdminJS dashboard for Agent Voice Response configuration
- Automated Docker deployment for all components (ASR, LLM and TTS)
- Asterisk management including:
  - Extension management
  - PJSIP configuration
- AMI (Asterisk Manager Interface) integration
- MySQL database for configuration storage

## Architecture

The application consists of several Docker containers that work together:

- **avr-app**: The main AdminJS application
- **avr-app-db**: MySQL database for storing configuration
- **avr-ami**: Asterisk Manager Interface service
- **avr-asterisk**: Asterisk VoIP server

## Prerequisites

- Docker and Docker Compose

## Installation

1. **Clone the AVR Infrastructure**: 
   - Clone the `avr-infra` repository from [https://github.com/agentvoiceresponse/avr-infra](https://github.com/agentvoiceresponse/avr-infra).

2. **Set Environment Variables**:
   - Configure the following environment variables in your `.env` file:
     ```bash
     NODE_ENV=production
     APP_VERSION=1.0.0
     PORT=3000
    
     ADMIN_EMAIL=YOUR_EMAIL
     ADMIN_PASSWORD=YOUR_PASSWORD
    
     DATABASE_HOST=127.0.0.1
     DATABASE_PORT=3306
     DATABASE_NAME=avr-app
     DATABASE_USERNAME=avr
     DATABASE_PASSWORD=MYSQL_PASSWORD
     
     DATABASE_ROOT_PASSWORD=MYSQL_ROOT_PASSWORD
     ```

3. **Run Docker Compose**:
   - Navigate to the project directory and run:
     ```bash
     docker-compose up
     ```

## Usage

Enjoy the Agent Voice Response App experience! After installation, you can access the application through your browser.

<div align="center">
  <img src="https://github.com/agentvoiceresponse/.github/blob/main/profile/images/avr-login.png" alt="Login Screen" width="600">
  <br>
  <em>The secure login interface for the AVR application</em>
</div>

<div align="center">
  <img src="https://github.com/agentvoiceresponse/.github/blob/main/profile/images/avr-dashboard.png" alt="Dashboard" width="600">
  <br>
  <em>The intuitive dashboard for managing your voice response agents</em>
</div>

## Development

### Available Scripts

- `npm run start:dev`: Start development server with Nodemon
- `npm run start`: Start production server
- `npm run build`: Build the TypeScript project
- `npm run build:watch`: Watch for changes and rebuild
- `npm run dc:up`: Start Docker Compose services
- `npm run dc:down`: Stop Docker Compose services

## Directory Structure

- `src/`: Source code
  - `admin/`: AdminJS configuration
  - `servers/`: Server setup code
  - `sources/`: Data sources and models
- `dist/`: Compiled JavaScript code
- `public/`: Static assets
- `asterisk/`: Asterisk configuration files
- `db/`: Database volume mount
- `functions/`: Custom OpenAI Assistants functions
- `keys/`: Security keys and certificates

## Community

Join our growing community of developers and users to share ideas, get help, and collaborate on projects:

- [Discord Server](https://discord.gg/MUd3y7eGVF) - Connect with other AVR users and the development team

## Contributions

For those who wish to contribute to the project, please send an email to [info@agentvoiceresponse.com](mailto:info@agentvoiceresponse.com).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

