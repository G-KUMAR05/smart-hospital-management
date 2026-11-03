# Smart Hospital Management System 

A web-based hospital management application built with **React, TypeScript, Java Spring Boot, MySQL, and Google Gemini AI**. It helps manage hospital operations and provides AI-generated clinical report summaries and referral suggestions for healthcare professionals to review.

## Features

- **Dashboard:** View a summary of hospital activities.
- **Patient Management:** Manage patient records.
- **Doctor Management:** Maintain doctor information.
- **Appointment Management:** Organize patient appointments.
- **Consultations:** Store and view consultation records.
- **Bed Management:** Track hospital bed information.
- **Medicine Inventory:** Manage medicine stock information.
- **AI Patient Report Summary:** Generate summaries from available patient and consultation data using Google Gemini.
- **AI Referral Suggestions:** Suggest possible medical specialties based on documented clinical information.
- **Fallback Responses:** Provide fallback suggestions when the AI service is unavailable.
- **API Documentation:** Explore and test backend endpoints using Swagger UI.

> **Important:** AI-generated content is for demonstration and clinician review only. It is not a diagnosis, prescription, or substitute for professional medical judgment. Use synthetic or properly authorized data when testing this project.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript |
| Backend | Java 21, Spring Boot 3.5.6 |
| Database | MySQL |
| Database migrations | Flyway |
| AI integration | Google Gemini API |
| API documentation | Swagger UI / OpenAPI |
| Build tools | npm and Maven |

## Prerequisites

Install the following before running the project:

1. **Java JDK 21**
2. **Node.js and npm** — use a version compatible with the frontend dependencies.
3. **MySQL Server**
4. **Git**
5. **IntelliJ IDEA** or another Java IDE (recommended)
6. A Google Gemini API key for AI-powered features.

Verify your installations:

```bash
java -version
node -v
npm -v
git --version
```

Also verify that MySQL is running on your computer.

## 1. Download the project

Clone the repository:

```bash
git clone https://github.com/G-KUMAR05/smart-hospital-management.git
```

Move into the downloaded project:

```bash
cd smart-hospital-management
```

Open the project in IntelliJ IDEA or your preferred editor.

## 2. Configure MySQL

Start MySQL and create the development database:

```sql
CREATE DATABASE smart_hospital_dev;
```

Open the backend configuration file, usually:

`src/main/resources/application.yml`

Find the datasource settings and configure them for your local MySQL installation. For example:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/smart_hospital_dev
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

Keep any other existing Spring Boot settings in the file, including Flyway configuration, and adapt this example to the structure already present in your project.

Set the environment variables `DB_USERNAME` and `DB_PASSWORD` to your own local MySQL credentials. Do not commit real passwords to GitHub.

**Database setup:** The application is configured to use Flyway migrations. If your existing migration configuration is enabled, the backend should apply the available migrations at startup. Check the application logs for migration errors.

## 3. Configure Google Gemini AI

The AI features use the Google Gemini API.

1. Obtain an API key through Google AI Studio: https://aistudio.google.com/
2. Set the `GEMINI_API_KEY` environment variable on your computer.
3. Keep the API key private. Never place it directly in source code or commit it to GitHub.

The application configuration should reference the variable rather than contain the actual key:

```yaml
gemini:
  api-key: ${GEMINI_API_KEY}
  model: gemini-3.5-flash-lite
```

Use a Gemini model currently available to your API account if the configured model is no longer supported.

For a local Windows Command Prompt session, you can set the variables before launching the backend:

```bat
set DB_USERNAME=your_mysql_username
set DB_PASSWORD=your_mysql_password
set GEMINI_API_KEY=your_gemini_api_key
```

Replace the example values with your own credentials. These commands apply to the current Command Prompt session only.

If you use IntelliJ IDEA, you can alternatively add the variables in the Spring Boot run configuration under **Environment variables**.

The backend can return fallback content if the Gemini service is unavailable, depending on the endpoint. AI-generated responses require a working API key and internet access.

## 4. Run the backend

Locate the backend directory containing `pom.xml`.

Open a terminal in that directory and run the following command if the Maven wrapper is included:

**Windows:**

```bat
mvnw.cmd spring-boot:run
```

If Maven is installed globally instead:

```bash
mvn spring-boot:run
```

Alternatively, open the Spring Boot application in IntelliJ IDEA and run its main application class.

Once the backend starts successfully, the API should be available at:

http://localhost:8080

The API base path is:

```text
http://localhost:8080/api/v1
```

## 5. Run the frontend

Open a second terminal in the frontend directory containing `package.json`.

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the URL printed in the terminal. The expected local address for this project is:

http://localhost:5173

Keep both the backend and frontend running while using the application.

If the repository uses different directory names, enter the appropriate folders before running these commands.

## 6. Access the application

| Service | Local address |
|---|---|
| Frontend application | http://localhost:5173 |
| Backend server | http://localhost:8080 |
| API base path | http://localhost:8080/api/v1 |
| Swagger API documentation | http://localhost:8080/swagger-ui.html |

If Swagger UI does not open at that address, check the Swagger configuration and the application logs for the configured documentation path.

## 7. AI API endpoints

The following endpoints are available in the current implementation:

### Patient report summary

```http
GET /api/v1/ai/patient-report/{patientId}
```

Retrieves patient and consultation information and generates an AI-assisted report summary when the Gemini service is available.

The response can include:

- Patient observations and consultation history
- Latest documented assessment
- AI-generated report summary
- AI generation status
- A clinician-review notice

### Referral suggestions

```http
POST /api/v1/ai/referral-suggestions/{patientId}
Content-Type: application/json
```

Example request body:

```json
{
  "context": "Additional context for referral consideration"
}
```

The endpoint uses available patient and consultation information, together with the supplied context, to suggest relevant medical specialties for clinician review.

The response may include suggested specialties, supporting reasons, generation status, and a review notice. If Gemini is unavailable, the endpoint can return a fallback suggestion.

To test these endpoints, open Swagger UI, locate the AI endpoints, and execute requests using an existing patient ID in your development database.

## 8. Troubleshooting

**Backend does not start**
- Confirm Java 21 is installed.
- Check the MySQL connection settings.
- Confirm that the required environment variables are set.
- Check the backend console for startup errors.

**Database connection fails**
- Confirm MySQL is running.
- Verify the database name, username, and password.
- Check that the database server is listening on the configured port.
- Review Flyway migration errors in the logs.

**Frontend does not start**
- Confirm Node.js and npm are installed.
- Run `npm install` in the frontend directory.
- Check the terminal output for missing packages or build errors.

**AI summary is unavailable**
- Confirm `GEMINI_API_KEY` is set in the backend process environment.
- Verify that the configured model is available to your API account.
- Check internet access, API quota, and the backend logs.
- Remember that temporary provider errors can prevent AI generation.

**Frontend cannot communicate with the backend**
- Confirm the backend is running on port 8080.
- Check the API URL and browser developer console.
- Verify that the backend's CORS configuration permits the frontend development origin.

## Security and privacy

- Never commit API keys, database passwords, or other secrets.
- Use environment variables or an appropriate local secrets manager.
- Do not upload real patient information to public repositories or external AI services without the required authorization and privacy safeguards.
- Use synthetic patient data for development and demonstrations.
- AI summaries and referral suggestions must be reviewed by a qualified clinician before any clinical use.

## Future improvements

Potential extensions include:

- Live bed and equipment status monitoring
- Hospital resource utilization dashboards
- Real-time alerts and notifications
- Digital-twin visualization of hospital resources
- Predictive analytics for resource planning
- Role-based access control and audit logs

These are potential future enhancements and should not be assumed to be implemented in the current version.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test them locally.
4. Commit your changes.
5. Open a pull request describing your changes.

## License

No license has been specified yet. Contact the repository owner before reusing, distributing, or modifying this project beyond the permissions granted by applicable law.

## Author

**Kumar G.**

GitHub: https://github.com/G-KUMAR05
