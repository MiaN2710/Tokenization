# Kinetic Text Editor

A local web application for modifying text content across the Kinetic app (Hugo-based website).

## Features

- **Markdown File Editing**: Edit frontmatter and content of all `.md` files in the `/content` directory
- **Configuration Editing**: Modify site title, moto, description and other text content in `hugo.yaml`
- **Template Editing**: Edit text content in HTML template files
- **Real-time Changes**: Track which files have been modified
- **Bulk Operations**: Save individual files or export all changes

## Installation & Setup

1. Navigate to the text-editor directory:
   ```bash
   cd /Users/minhnguyen/kinetic/text-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open your browser and go to: http://localhost:3000

## How to Use

### Scanning Content
- Click "Refresh Content" to scan all text content from the Kinetic app
- The app will automatically scan on first load

### Editing Content

#### Markdown Files Tab
- Edit page titles, descriptions, and full content
- Click "Save Changes" for individual files when modifications are made

#### Configuration Tab
- Edit site title, moto, and description
- Modify any configuration text values
- Save changes to update the `hugo.yaml` file

#### HTML Templates Tab
- View and edit extracted text from HTML templates
- Modify template source code directly
- Save changes to update template files

### Tracking Changes
- Modified files show "Save Changes" button (enabled only when changes are detected)
- Use "Export Changes" to download a JSON file of all modifications

## File Structure

```
text-editor/
├── package.json          # Dependencies and scripts
├── server.js            # Express server with API endpoints
├── public/
│   ├── index.html       # Main UI (Vue.js app)
│   └── app.js          # Frontend JavaScript logic
└── README.md           # This file
```

## API Endpoints

- `GET /api/scan` - Scan and return all text content
- `POST /api/update-markdown` - Save markdown file changes
- `POST /api/update-config` - Save configuration changes
- `POST /api/update-template` - Save HTML template changes

## Supported File Types

1. **Markdown Files** (`.md`): All files in `/content` directory and subdirectories
2. **Configuration** (`hugo.yaml`): Site configuration and parameters
3. **HTML Templates** (`.html`): All files in `/themes/tailbliss/layouts` directory

## Development

Run in development mode with auto-restart:
```bash
npm run dev
```

## Safety Features

- Original files are backed up during scanning
- Changes are tracked per file
- Export functionality to save change history
- Real-time validation of file modifications