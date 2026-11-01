import type { onboarding as vi } from "../vi/onboarding";

export const onboarding: Record<keyof typeof vi, string> = {
  "onboarding.tourSteps.meetings": "Under Calendar & time, open Meet to schedule meetings and invite colleagues or departments and teams. Supply your own Google Meet link; Orbit does not create meeting rooms.",
  "onboarding.tourSteps.attendance": "Open Attendance under Calendar & time. Check in when you start and check out when you finish, then review your monthly history.",
  "onboarding.tourSteps.leave": "Open Leave to submit requests, check your allowance and follow approval results. Approved leave appears on your calendar; managers review requests within their permissions.",
  "onboarding.tourSteps.finance": "With finance access, open Payslips, Income & expenses or Cash flow reports. Submit payslips to the CEO before payment. If Finance is missing, ask the CEO to check your access.",

  "onboarding.acceptInvitationForm.3100CharactersLettersDigitsDots":
    "3-100 characters: letters, digits, dots, underscores or hyphens",
  "onboarding.acceptInvitationForm.askThePersonWhoInvitedYou":
    "Ask the person who invited you to send a new invitation.",
  "onboarding.acceptInvitationForm.couldnTCreateTheAccount": "Couldn't create the account",
  "onboarding.acceptInvitationForm.createAccountAndEnterOrbit": "Create account and enter Orbit",
  "onboarding.acceptInvitationForm.goToTheSignInPage": "Go to the sign-in page",
  "onboarding.acceptInvitationForm.invitesYouToJoin": "invites you to join",
  "onboarding.acceptInvitationForm.password872Characters": "Password (8-72 characters)",
  "onboarding.acceptInvitationForm.reEnterThePassword": "Re-enter the password",
  "onboarding.acceptInvitationForm.role": "Role:",
  "onboarding.acceptInvitationForm.signOutAndContinue": "Sign out and continue",
  "onboarding.acceptInvitationForm.signOutToCreateANew":
    "Sign out to create a new account from this invitation.",
  "onboarding.acceptInvitationForm.thePasswordsDonTMatch": "The passwords don't match",
  "onboarding.acceptInvitationForm.thisInvitationIsInvalidOrHas":
    "This invitation is invalid or has expired.",
  "onboarding.acceptInvitationForm.youReSignedInAs": "You're signed in as",
  "onboarding.companyBadge.aboutName": "About {name}",
  "onboarding.companyEditDialog.companyDetails": "Company details",
  "onboarding.companyEditDialog.companyDetailsSaved": "Company details saved",
  "onboarding.companyEditDialog.companyEmail": "Company email",
  "onboarding.companyEditDialog.companyName": "Company name",
  "onboarding.companyEditDialog.couldnTSaveTheCompanyDetails": "Couldn't save the company details",
  "onboarding.companyEditDialog.shortDescription": "Short description",
  "onboarding.companyImageButton.changeCoverImage": "Change cover image",
  "onboarding.companyImageButton.changeLogo": "Change logo",
  "onboarding.companyImageButton.chooseTheCompanyLabel": "Choose the company {label}",
  "onboarding.companyImageButton.couldnTUploadTheLabel": "Couldn't upload the {label}",
  "onboarding.companyImageButton.coverImage": "cover image",
  "onboarding.companyImageButton.coverImageUpdated": "Cover image updated",
  "onboarding.companyImageButton.logo": "logo",
  "onboarding.companyImageButton.logoUpdated": "Logo updated",
  "onboarding.companyImageButton.theImageCanBe2mbAt": "The image can be 2MB at most",
  "onboarding.companyImageButton.theImageMustBePngJpeg": "The image must be PNG, JPEG or WebP",
  "onboarding.companyImageButton.uploadCoverImage": "Upload cover image",
  "onboarding.companyImageButton.uploadLogo": "Upload logo",
  "onboarding.companyOverview.editDetails": "Edit details",
  "onboarding.companyOverview.manageDepartments": "Manage departments",
  "onboarding.companyOverview.noDescriptionYetClickEditDetails":
    'No description yet. Click "Edit details" to add one.',
  "onboarding.companyOverview.quickSettings": "Quick settings",
  "onboarding.companyOverview.theCompanyHasNoDepartmentsYet": "The company has no departments yet",
  "onboarding.companyOverview.theCompanyHasNoDescriptionYet": "The company has no description yet.",
  "onboarding.companyProfileForm.pngJpegWebp2mbAtMost": "PNG, JPEG, WebP · 2MB at most",
  "onboarding.errors.emailAlreadyInUse":
    "This email already belongs to another account, so it cannot be used for an invitation.",
  "onboarding.errors.theCodeIsWrongHasExpired":
    "The code is wrong, has expired, or was entered incorrectly too many times. Request a new code.",
  "onboarding.errors.theDepartmentOrTeamOfThis":
    "The department or team of this invitation no longer exists. Ask the person who invited you to send a new one.",
  "onboarding.errors.theEmailServiceIsnTReady":
    "The email service isn't ready. Please try again later.",
  "onboarding.errors.theEmailVerificationExpiredOrWas":
    "The email verification expired or was already used. Please verify your email again.",
  "onboarding.errors.thisEmailAlreadyBelongsToAn":
    'This email already belongs to an account. Sign in, or use "Forgot password" if you don\'t remember the password.',
  "onboarding.errors.thisUsernameIsAlreadyTakenChoose":
    "This username is already taken, choose another.",
  "onboarding.errors.youReGoingTooFastPlease":
    "You're going too fast. Please try again in a few minutes.",
  "onboarding.inviteStaffButton.chooseATeam": "-- Choose a team --",
  "onboarding.inviteStaffButton.couldnTResendIt": "Couldn't resend it",
  "onboarding.inviteStaffButton.couldnTSendTheInvitation": "Couldn't send the invitation",
  "onboarding.inviteStaffButton.daysLeft_one": "{count} day left",
  "onboarding.inviteStaffButton.daysLeft_other": "{count} days left",
  "onboarding.inviteStaffButton.expired": "Expired",
  "onboarding.inviteStaffButton.invitationResent": "Invitation resent",
  "onboarding.inviteStaffButton.invitationRevoked": "Invitation revoked",
  "onboarding.inviteStaffButton.invitationSentToV": "Invitation sent to {v}",
  "onboarding.inviteStaffButton.inviteByEmail": "Invite by email",
  "onboarding.inviteStaffButton.inviteeSEmail": "Invitee's email",
  "onboarding.inviteStaffButton.jobTitleOptional": "Job title (optional)",
  "onboarding.inviteStaffButton.noPendingInvitations": "No pending invitations.",
  "onboarding.inviteStaffButton.pendingInvitationsCount": "Pending invitations ({count})",
  "onboarding.inviteStaffButton.resend": "Resend",
  "onboarding.inviteStaffButton.teamOptional": "Team (optional)",
  "onboarding.inviteStaffButton.teamRequiredForATeamLead": "Team (required for a team lead)",
  "onboarding.inviteStaffButton.theRecipientOpensTheLinkIn":
    "The recipient opens the link in the email (valid for 7 days) to set their own username and password.",
  "onboarding.onboardingTour.back": "Back",
  "onboarding.onboardingTour.next": "Next",
  "onboarding.onboardingTour.skip": "Skip",
  "onboarding.onboardingTour.stepOf": "Step {current}/{total}",
  "onboarding.registerWizard.6DigitCodeSentToEmail": "6-digit code sent to {email}",
  "onboarding.registerWizard.aVerificationCodeHasBeenSent":
    "A verification code has been sent to your email (valid for 10 minutes).",
  "onboarding.registerWizard.administrator": "Administrator",
  "onboarding.registerWizard.administratorEmail": "Administrator email",
  "onboarding.registerWizard.changeEmail": "Change email",
  "onboarding.registerWizard.changeImage": "Change image",
  "onboarding.registerWizard.chooseALogo": "Choose a logo",
  "onboarding.registerWizard.chooseAnImage": "Choose an image",
  "onboarding.registerWizard.company": "Company",
  "onboarding.registerWizard.companyCreated": "Company created",
  "onboarding.registerWizard.companyEmailOptional": "Company email (optional)",
  "onboarding.registerWizard.companyLogoOptional": "Company logo (optional)",
  "onboarding.registerWizard.companyName": "Company name",
  "onboarding.registerWizard.couldnTSendTheVerificationCode": "Couldn't send the verification code",
  "onboarding.registerWizard.createCompany": "Create company",
  "onboarding.registerWizard.email": "Email",
  "onboarding.registerWizard.enterTheEmailOfThePerson":
    "Enter the email of the person who will be the administrator. We send a verification code to this address before creating the company.",
  "onboarding.registerWizard.logoPreview": "Logo preview",
  "onboarding.registerWizard.registrationSteps": "Registration steps",
  "onboarding.registerWizard.removeImage": "Remove image",
  "onboarding.registerWizard.sendVerificationCode": "Send verification code",
  "onboarding.registerWizard.takingYouIntoOrbit": "Taking you into Orbit...",
  "onboarding.registerWizard.theLogoCanBe2mbAt": "The logo can be 2MB at most",
  "onboarding.registerWizard.theLogoMustBeAPng": "The logo must be a PNG, JPEG or WebP image",
  "onboarding.registerWizard.theVerificationCodeIsIncorrect": "The verification code is incorrect",
  "onboarding.registerWizard.verify": "Verify",
  "onboarding.registerWizard.yourCompanyIsReady": "Your company is ready!",
  "onboarding.tourSteps.aFewQuickStepsToGet":
    "A few quick steps to get to know Orbit and set up your company. You can skip at any time and watch it again in Settings.",
  "onboarding.tourSteps.aPomodoroTimerFocusedWorkIn":
    "A Pomodoro timer: focused work in sessions with short breaks between them. The timer keeps running when you close the window or change page.",
  "onboarding.tourSteps.aShortTourOfThePlaces":
    "A short tour of the places you'll use every day. You can skip it and watch it again in Settings.",
  "onboarding.tourSteps.acceptOrDeclineTheTasksYou":
    "Accept or decline the tasks you're given, then follow and complete them. Click a task to see its details, attachments and Google Drive link. A task with a checklist completes itself when you tick every line; the + button adds a task for yourself (no approval needed). The person who assigned a task is notified when you accept, decline or complete it.",
  "onboarding.tourSteps.buildTheStructureFirstClickCreate":
    "Build the structure first: click 'Create a department', pick a color and icon for each, then add teams. Inside a department the + button quickly adds staff to that department.",
  "onboarding.tourSteps.clickOrPressCtrlKThen":
    "Click or press Ctrl+K, then type the name of a page or a small feature inside it (for example 'checklist', 'change password'): the results show the page that contains it with the feature below, and your keywords are highlighted.",
  "onboarding.tourSteps.clickTheLogoOrTheCompany":
    "Click the logo or the company name at the top to see the introduction, cover image and departments. Administrators have quick settings right on the page: edit details, change the logo, change the cover image.",
  "onboarding.tourSteps.clickYourProfilePhotoSettingsOr":
    "Click your profile photo > Settings (or the quick settings on the company page) to upload a logo and cover image, change the company's name, email and description, and choose a theme. The same menu lets you change your status and photo, and sign out.",
  "onboarding.tourSteps.clickYourProfilePhotoToSwitch":
    "Click your profile photo to switch your status quickly (online / limited / do not disturb), open Settings (theme, password, recovery email), change your photo or sign out.",
  "onboarding.tourSteps.companyPage": "Company page",
  "onboarding.tourSteps.connectDriveAndManageFolderAccess":
    "Connect Drive and manage folder access by department.",
  "onboarding.tourSteps.crossDepartmentProjects": "Cross-department projects",
  "onboarding.tourSteps.departmentsTeams": "Departments & teams",
  "onboarding.tourSteps.firstThingsToDoCreateA":
    "First things to do: create a department, then invite staff into it. Watch this guide again at any time in Settings.",
  "onboarding.tourSteps.inStaffClickInviteByEmail":
    "In Staff, click 'Invite by email': the recipient opens the link and chooses their own username and password. The + button creates an account yourself. Click a person's name to open their management window: department and position, KPI, calendar, password reset, email change.",
  "onboarding.tourSteps.inviteStaff": "Invite staff",
  "onboarding.tourSteps.newTasksPeopleAcceptingOrCompleting":
    "New tasks, people accepting or completing a task you assigned, messages, calendar events to confirm and Drive requests. Click a notification to go straight to it.",
  "onboarding.tourSteps.oneToOneChatWithColleagues":
    "One-to-one chat with colleagues: type in the search box to see people in your department right away and start talking, send images (click to enlarge) and files, recall messages you sent, and archive conversations you no longer need.",
  "onboarding.tourSteps.openTwoPagesSideBySide":
    "Open two pages side by side. Each tab belongs to one half; drag a tab to the other half to move it, and drag the bar between them to resize. Click the Orbit logo at any time to go home.",
  "onboarding.tourSteps.seeTheDepartmentsAndEachDepartment":
    "See the departments and each department's staff directory; click a person's name to message them or send a Drive request.",
  "onboarding.tourSteps.seeTheMonthSCalendarAnd":
    "See the month's calendar and click a day to see its events. Upcoming events are listed below. Add an event with the + button; the 'Business trip' type lets you pick a start and an end date. Confirm or decline events other people add for you.",
  "onboarding.tourSteps.seeTheStaffYouManageClick":
    "See the staff you manage, click a name to open their management window, and click 'Invite by email' to invite people into your department or team.",
  "onboarding.tourSteps.setUpYourCompany": "Set up your company",
  "onboarding.tourSteps.switchTheHomePageBetweenThe":
    "In Home, use Home display to choose Overview or Task board.",
  "onboarding.tourSteps.viewTasksAsColumns": "View tasks as columns",
  "onboarding.tourSteps.welcomeToOrbit": "Welcome to Orbit!",
  "onboarding.tourSteps.whenAJobNeedsSeveralDepartments":
    "When a job needs several departments: the leading department creates the project and invites others to support it. An invited department head accepts, then picks their own people; all departments share the tasks, team chat, a shared Drive folder and the member directory.",
  "onboarding.tourSteps.youCanWatchThisGuideAgain":
    "You can watch this guide again at any time in Settings.",
  "onboarding.tourSteps.youReReady": "You're ready!",
  "onboarding.tourSteps.yourPrivateNotesShownAsCards":
    "Your private notes, shown as cards and searchable by keyword. Click a card to expand and edit it; pin it to keep it floating on every page until you unpin it.",
  "onboarding.tourSteps.yourStaff": "Your staff",
  "onboarding.tourSteps.yourToDoListGroupedBy":
    "In Home, choose Priority suggestions under Home display to see tasks grouped by high / medium / low priority.",
};
