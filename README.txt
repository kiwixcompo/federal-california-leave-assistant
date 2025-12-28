Federal & California Leave Assistant
===================================

A compliance-focused HR tool for drafting employee responses regarding FMLA and California leave laws.

## Features

- **Authentication System**: User registration, login, and session management
- **Federal Leave Assistant**: FMLA compliance support with strict scope limitations
- **California Leave Assistant**: FMLA, CFRA, and PDL compliance with proper analysis order
- **Two Response Modes**: Employee email drafting and quick administrative questions
- **Demo Mode**: Built-in mock responses for testing without API keys
- **OpenAI Integration**: Real AI responses when API key is provided
- **Admin Dashboard**: User management and access control
- **Settings Management**: API key and password management

## Quick Start

1. **Download/Clone** this repository
2. **Place files** in your web server directory (e.g., `/leave_assistant/`)
3. **Access via browser**: `http://localhost/leave_assistant/`
4. **Login with demo account**: 
   - Email: `talk2char@gmail.com`
   - Password: `Password@123`

## File Structure

```
leave_assistant/
├── index.html          # Main application file
├── styles.css          # All styling and layout
├── app.js             # Complete application logic
├── README.txt         # Basic setup instructions
└── .gitignore         # Git ignore rules
```

## Usage

### Demo Mode (Default)
- Login with admin credentials
- Use "demo" as API key in Settings
- Get realistic mock responses immediately
- No external API calls required

### Real AI Mode
1. Get OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Go to Settings in the app
3. Enter your real API key
4. Generate actual AI responses

### Federal Leave Assistant
- **Scope**: FMLA (Federal) only
- **Exclusions**: CFRA, PDL, state laws, local ordinances
- **Safety**: Never approves/denies leave or provides legal advice
- **Modes**: Employee email drafts or quick administrative questions

### California Leave Assistant
- **Scope**: FMLA, CFRA, PDL
- **Analysis Order**: FMLA → CFRA → PDL (when multiple laws apply)
- **Exclusions**: PFL wage replacement, Workers' Comp, SDI
- **Safety**: Never approves/denies leave or provides legal advice

## Technical Details

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server (Apache, Nginx, IIS, or local development server)
- JavaScript enabled
- Local Storage support

### Data Storage
- All user data stored in browser localStorage
- No server-side database required
- Sessions persist across browser sessions
- Data is isolated per browser/device

### Security
- Client-side only application
- API keys stored locally in browser
- No data transmitted to external servers (except OpenAI when using real API)
- Demo mode works completely offline

### Browser Compatibility
- ES6+ JavaScript features required
- Fetch API for OpenAI integration
- Local Storage for data persistence
- CSS Grid and Flexbox for layout

## Compliance Features

### Response Safety
- Never approves or denies leave requests
- Never confirms employee eligibility
- Never provides legal advice
- Never diagnoses medical conditions
- Always defers decisions to employer/HR

### Content Accuracy
- Federal tool strictly limited to FMLA
- California tool follows proper law analysis order
- Professional, neutral tone throughout
- Appropriate disclaimers included

## Development

### Customization
- **Styling**: Edit `styles.css` for appearance changes
- **Functionality**: Modify `app.js` for feature updates
- **Content**: Update `index.html` for structure changes

### Adding Features
- All code is in single files for easy modification
- Well-commented JavaScript for maintainability
- Modular CSS classes for styling updates
- localStorage-based data model for simplicity

## Troubleshooting

### Common Issues
1. **Styling not loading**: Check that `styles.css` is in the same directory as `index.html`
2. **JavaScript errors**: Check browser console for error messages
3. **CORS errors**: Use demo mode or implement proper CORS proxy for real API calls
4. **Login issues**: Clear localStorage and refresh page

### Debug Functions
Open browser console and use:
- `resetToDemo()` - Clear all data and reset to demo mode
- `setDemoMode()` - Set current user to demo mode

### Reset Instructions
1. Open browser Developer Tools (F12)
2. Go to Application/Storage tab
3. Find Local Storage for your domain
4. Clear all entries
5. Refresh the page

## License

This project is proprietary software. All rights reserved.

## Support

For technical issues or questions:
1. Check browser console for error messages
2. Try demo mode for testing
3. Clear localStorage if experiencing issues
4. Ensure all files are in the same directory