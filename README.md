# Penda Connect

MASTER PROMPT – PART 1



PENDA FOUNDATION MANAGEMENT SYSTEM (PFMS)



PROJECT OVERVIEW



You are an expert software architect, Flutter developer, Firebase engineer, UI/UX designer, cybersecurity engineer, and DevOps engineer.



Design and develop a production-ready application called Penda Foundation Management System (PFMS).



This application is an internal management platform for Penda Foundation. It is not a public application and can only be accessed by authorized users created by the Super Admin.



The application must be modern, scalable, secure, intuitive, responsive, and simple enough for users with little technical knowledge.



The platform should support Android, iOS, Web, and Desktop using one Flutter codebase connected to Firebase.





---



PROJECT OBJECTIVES



The system should help the organization manage:



Members



Staff



Attendance



Monthly Membership Fees



Events



Birthdays



Announcements



Notifications



Reports



Departments



Branches



Documents



Organization Calendar



User Accounts



User Permissions



Assigned Responsibilities



Organization Settings





The application should eliminate paper records while improving efficiency, transparency, and accountability.





---



TARGET USERS



The system is designed for:



Super Admin



Administrators



Finance Officers



Attendance Officers



Welfare Officers



Secretaries



Branch Leaders



Department Leaders



Members





Every user should only access features assigned by the Super Admin.





---



DESIGN PHILOSOPHY



The application should follow these principles.



Simple



No complicated layouts.



Every screen should be understandable within seconds.





---



Professional



The application should look like enterprise software used by large organizations.





---



Clean



Avoid clutter.



Use whitespace properly.



Use consistent spacing.





---



Fast



Every screen should load quickly.



Navigation should be instant.





---



Responsive



The application should work perfectly on:



Android



iPhone



Tablet



Desktop



Web





---



Scalable



The architecture should support thousands of members without redesigning the application.





---



Secure



Every feature must follow security best practices.





---



BRAND IDENTITY



Use the Penda Foundation branding throughout the application.



The application should match the organization's existing website.



Primary Color



Penda Red



Hex



#E31C25



Use for:



Primary buttons



Active menu



Important actions



Charts



Statistics



Highlights





---



Secondary Color



Penda Green



Hex



#2E7D32



Use for:



Success



Positive indicators



Links



Growth statistics



Completed tasks





---



Background



Light Mode



#F8F9FA



Dark Mode



#121212





---



Card Color



White





---



Text Colors



Primary



#1F2937



Secondary



#6B7280



Disabled



#9CA3AF





---



TYPOGRAPHY



Use Google Font: Poppins



Weights:



Regular



Medium



SemiBold



Bold



Headings should be bold.



Paragraphs should be highly readable.





---



ICONS



Use Material Icons.



Rounded style.



Simple.



Consistent.



Avoid decorative icons.





---



COMPONENT STYLE



Everything must use reusable widgets.



Examples:



Buttons



Cards



Forms



Dialogs



Snackbars



Search Bars



Statistics Cards



Profile Cards



Tables



Charts



Bottom Navigation



App Bars



Loading Indicators



Empty States



Error Pages



Every component should come from one centralized design system.





---



UI STYLE



The interface should feel similar to:



Google Workspace



Microsoft Teams



Notion



Firebase Console



Linear



Simple.



Professional.



Modern.





---



APP STRUCTURE



The application contains only two platforms.



Flutter Mobile App



Flutter Web/Desktop Admin Panel



There is NO public website.





---



NAVIGATION



On Mobile use a Bottom Navigation Bar.



The navigation contains only five items.



🏠 Home



👥 Members



📅 Calendar



🔔 Notifications



☰ More



The navigation bar must always remain visible.



Selected icon:



Penda Red



Inactive icon:



Gray



Background:



White



Rounded top corners.



Soft shadow.





---



HOME DASHBOARD



The Home Dashboard should display:



Welcome Message



User Profile Picture



Role



Department



Today's Date



Organization Logo



Quick Statistics



Upcoming Birthdays



Upcoming Events



Recent Activities



Announcements



Quick Action Buttons



Charts



Dashboard Cards



Every dashboard should automatically change according to user permissions.





---



QUICK ACTIONS



Quick Action buttons should include:



Register Member



Record Attendance



Record Payment



Create Event



View Reports



Create Announcement



Manage Documents



Only show actions allowed for that user.





---



DESIGN SYSTEM



Create one centralized design system.



Typography



Spacing



Colors



Border Radius



Shadows



Icons



Animations



Buttons



Cards



Forms



Tables



Charts



Dialogs



Everything should use this system.





---



BUTTONS



Primary Button



Red background



White text



Rounded



Soft shadow



Secondary Button



White background



Red border



Red text



Success Button



Green



Danger Button



Dark Red



Disabled Button



Gray





---



CARDS



Cards should have:



Rounded corners



Soft shadow



White background



Padding



Comfortable spacing



Small elevation



Dashboard cards should display:



Icon



Title



Value



Trend Indicator





---



FORMS



Every form should include:



Floating labels



Validation



Helper text



Search



Dropdowns



Date Picker



Phone Number Formatter



Image Upload



Auto-complete



Error handling





---



TABLES



Desktop:



Professional Data Tables



Sorting



Filtering



Pagination



Export



Mobile:



Cards instead of tables.





---



SEARCH



Global Search should exist throughout the application.



Search:



Members



Users



Payments



Attendance



Events



Reports



Announcements



Documents



Settings





---



LOADING STATES



Use Skeleton Loading.



Circular Progress Indicator.



Linear Progress Indicator.



Do not leave blank screens while loading.





---



EMPTY STATES



Every empty page should have:



Illustration



Title



Description



Action Button



Example



"No members have been registered."



Button



Register Member





---



ERROR HANDLING



Use friendly error pages.



Retry button.



Helpful explanations.





---



ANIMATIONS



Animations should be subtle.



Fade



Slide



Scale



Do not overuse animations.



The application should feel fast.





---



RESPONSIVE DESIGN



The application must automatically adapt to:



Phone



Tablet



Laptop



Desktop



Web



Without breaking layouts.





---



OFFLINE SUPPORT



Allow users to:



View cached data



Continue working



Automatically synchronize when internet returns.





---



PERFORMANCE



Optimize for:



Fast startup



Image caching



Pagination



Lazy loading



Minimal Firebase reads



Fast Firestore queries



Background synchronization





---



CODE STANDARDS



Use:



Clean Architecture



Feature-First Folder Structure



SOLID Principles



Reusable Components



Reusable Services



Dependency Injection



Consistent Naming



Documentation



Production-ready code



Well-commented source code



Avoid duplicate code.





---



FEATURE-FIRST FOLDER STRUCTURE



lib/



features/



authentication/



dashboard/



members/



attendance/



finance/



calendar/



events/



birthdays/



announcements/



notifications/



reports/



documents/



departments/



branches/



users/



settings/



shared/



widgets/



theme/



services/



models/



utils/



constants/



Every feature must be independent and easy to maintain.





---



FINAL DESIGN GOAL



The application should feel like a premium enterprise management platform built specifically for Penda Foundation. It should use the organization's branding consistently, prioritize simplicity and usability, and provide a secure, scalable foundation for managing members, staff, finances, attendance, events, and organizational operations.



End of Part 1.
