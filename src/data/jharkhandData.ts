import type { CitizenProblem, JharkhandLanguage, TrackingStage } from '../types'

export interface JharkhandDistrict {
  id: string
  name: string
  hindiName: string
  division: string
  headquarters: string
  latitude: number
  longitude: number
  keyLocalities: string[]
}

export const JHARKHAND_DISTRICTS: JharkhandDistrict[] = [
  { id: 'ranchi', name: 'Ranchi', hindiName: 'राँची', division: 'South Chotanagpur', headquarters: 'Ranchi', latitude: 23.3441, longitude: 85.3096, keyLocalities: ['Namkum', 'Kanke', 'Hatia', 'Ormanjhi', 'Ratu', 'Bundu'] },
  { id: 'east-singhbhum', name: 'East Singhbhum (Jamshedpur)', hindiName: 'पूर्वी सिंहभूम (जमशेदपुर)', division: 'Kolhan', headquarters: 'Jamshedpur', latitude: 22.8046, longitude: 86.2029, keyLocalities: ['Bistupur', 'Sakchi', 'Ghatshila', 'Potka', 'Mango', 'Golmuri'] },
  { id: 'dhanbad', name: 'Dhanbad', hindiName: 'धनबाद', division: 'North Chotanagpur', headquarters: 'Dhanbad', latitude: 23.7957, longitude: 86.4304, keyLocalities: ['Jharia', 'Katras', 'Govindpur', 'Nirsa', 'Sindri', 'Baghmara'] },
  { id: 'bokaro', name: 'Bokaro', hindiName: 'बोकारो', division: 'North Chotanagpur', headquarters: 'Bokaro Steel City', latitude: 23.6693, longitude: 86.1511, keyLocalities: ['Chas', 'Bermo', 'Gomia', 'Chandankiyari', 'Jaridih'] },
  { id: 'deoghar', name: 'Deoghar', hindiName: 'देवघर', division: 'Santhal Pargana', headquarters: 'Deoghar', latitude: 24.4826, longitude: 86.7001, keyLocalities: ['Jasidih', 'Madhupur', 'Sarath', 'Karon', 'Mohanpur'] },
  { id: 'hazaribagh', name: 'Hazaribagh', hindiName: 'हज़ारीबाग़', division: 'North Chotanagpur', headquarters: 'Hazaribagh', latitude: 23.9961, longitude: 85.3644, keyLocalities: ['Barhi', 'Barkagaon', 'Chauparan', 'Ichak', 'Katkamsandi'] },
  { id: 'giridih', name: 'Giridih', hindiName: 'गिरिडीह', division: 'North Chotanagpur', headquarters: 'Giridih', latitude: 24.1906, longitude: 86.3050, keyLocalities: ['Dumri', 'Bagodar', 'Tisri', 'Bengabad', 'Gandey', 'Deori'] },
  { id: 'ramgarh', name: 'Ramgarh', hindiName: 'रामगढ़', division: 'North Chotanagpur', headquarters: 'Ramgarh Cantonment', latitude: 23.6300, longitude: 85.5100, keyLocalities: ['Patratu', 'Gola', 'Mandu', 'Dulmi', 'Chitarpur'] },
  { id: 'dumka', name: 'Dumka', hindiName: 'दुमका', division: 'Santhal Pargana', headquarters: 'Dumka', latitude: 24.2690, longitude: 87.2470, keyLocalities: ['Ranishwar', 'Jarmaundi', 'Shikaripara', 'Jama', 'Masalia'] },
  { id: 'gumla', name: 'Gumla', hindiName: 'गुमला', division: 'South Chotanagpur', headquarters: 'Gumla', latitude: 23.0440, longitude: 84.5420, keyLocalities: ['Ghaghra', 'Bishunpur', 'Sisai', 'Raidih', 'Palkot', 'Basia'] },
  { id: 'simdega', name: 'Simdega', hindiName: 'सिमडेगा', division: 'South Chotanagpur', headquarters: 'Simdega', latitude: 22.6140, longitude: 84.5090, keyLocalities: ['Kolebira', 'Bano', 'Jaldega', 'Kurdeg', 'Bolba'] },
  { id: 'lohardaga', name: 'Lohardaga', hindiName: 'लोहरदगा', division: 'South Chotanagpur', headquarters: 'Lohardaga', latitude: 23.4420, longitude: 84.6800, keyLocalities: ['Kisko', 'Sena', 'Kuru', 'Bhandra', 'Peshrar'] },
  { id: 'palamu', name: 'Palamu', hindiName: 'पलामू', division: 'Palamu', headquarters: 'Daltonganj (Medininagar)', latitude: 24.0430, longitude: 84.0720, keyLocalities: ['Medininagar', 'Chhatarpur', 'Hussainabad', 'Panki', 'Bishrampur'] },
  { id: 'chatra', name: 'Chatra', hindiName: 'चतरा', division: 'North Chotanagpur', headquarters: 'Chatra', latitude: 24.2100, longitude: 84.8700, keyLocalities: ['Hunterganj', 'Itkhori', 'Simaria', 'Pratappur', 'Tandwa'] },
  { id: 'latehar', name: 'Latehar', hindiName: 'लातेहार', division: 'Palamu', headquarters: 'Latehar', latitude: 23.7430, longitude: 84.5020, keyLocalities: ['Netarhat', 'Mahuadanr', 'Balumath', 'Barwadih', 'Chandwa', 'Manika'] },
  { id: 'sahibganj', name: 'Sahibganj', hindiName: 'साहिबगंज', division: 'Santhal Pargana', headquarters: 'Sahibganj', latitude: 25.2440, longitude: 87.6430, keyLocalities: ['Rajmahal', 'Barharwa', 'Taljhari', 'Udhwa', 'Borio'] },
  { id: 'pakur', name: 'Pakur', hindiName: 'पाकुड़', division: 'Santhal Pargana', headquarters: 'Pakur', latitude: 24.6340, longitude: 87.8480, keyLocalities: ['Hiranpur', 'Littipara', 'Pakuria', 'Maheshpur', 'Amrapara'] },
  { id: 'godda', name: 'Godda', hindiName: 'गोड्डा', division: 'Santhal Pargana', headquarters: 'Godda', latitude: 24.8320, longitude: 87.2150, keyLocalities: ['Mahagama', 'Boarijor', 'Poraiyahat', 'Sundarpahari', 'Meharma'] },
  { id: 'koderma', name: 'Koderma', hindiName: 'कोडरमा', division: 'North Chotanagpur', headquarters: 'Koderma (Jhumri Telaiya)', latitude: 24.4690, longitude: 85.5940, keyLocalities: ['Jhumri Telaiya', 'Domchanch', 'Satgawan', 'Chandwara', 'Jainagar'] },
  { id: 'garhwa', name: 'Garhwa', hindiName: 'गढ़वा', division: 'Palamu', headquarters: 'Garhwa', latitude: 24.1610, longitude: 83.8080, keyLocalities: ['Nagar Untari', 'Ranka', 'Bhavnathpur', 'Meral', 'Majhiaon'] },
  { id: 'khunti', name: 'Khunti', hindiName: 'खूँटी', division: 'South Chotanagpur', headquarters: 'Khunti', latitude: 23.0720, longitude: 85.2790, keyLocalities: ['Torpa', 'Murhu', 'Karra', 'Rania', 'Arki'] },
  { id: 'saraikela-kharsawan', name: 'Saraikela-Kharsawan', hindiName: 'सरायकेला-खरसावां', division: 'Kolhan', headquarters: 'Saraikela', latitude: 22.7010, longitude: 85.9320, keyLocalities: ['Adityapur', 'Chandil', 'Gamharia', 'Kharsawan', 'Rajnagar'] },
  { id: 'west-singhbhum', name: 'West Singhbhum', hindiName: 'पश्चिमी सिंहभूम', division: 'Kolhan', headquarters: 'Chaibasa', latitude: 22.5630, longitude: 85.8110, keyLocalities: ['Chaibasa', 'Chakradharpur', 'Kiriburu', 'Noamundi', 'Manoharpur', 'Jagannathpur'] },
  { id: 'jamtara', name: 'Jamtara', hindiName: 'जामताड़ा', division: 'Santhal Pargana', headquarters: 'Jamtara', latitude: 23.9610, longitude: 86.8020, keyLocalities: ['Kundhit', 'Nala', 'Mihijam', 'Narayanpur', 'Karmatanr'] },
]

export const STAGE_NAMES = [
  'Problem Reported',
  'AI Pre-Screening',
  'Government Verification',
  'Government Accepted',
  'Recommended to University/HEI',
  'Faculty Assigned',
  'Student Team Formed',
  'Problem Analysis Started',
  'Resources Requested',
  'Partner Support Added',
  'Prototype/Pilot Development',
  'Pilot Testing',
  'Deployment',
  'Problem Resolved',
  'Citizen Feedback',
] as const

export const DEFAULT_STAGE_CONFIG: {
  name: string
  responsibleRole: TrackingStage['responsibleRole']
  responsibleOrg: string
  defaultDesc: string
}[] = [
  { name: 'Problem Reported', responsibleRole: 'Citizen', responsibleOrg: 'Citizen Portal', defaultDesc: 'Problem submission received and assigned official Track ID.' },
  { name: 'AI Pre-Screening', responsibleRole: 'Citizen', responsibleOrg: 'ImpactForge AI Engine', defaultDesc: 'Automated category classification, duplicate check against LIVE problems, and priority assessment completed.' },
  { name: 'Government Verification', responsibleRole: 'Government', responsibleOrg: 'District Validation Team', defaultDesc: 'Pending Government Verification: Human validator reviews authenticity (Genuine → Validated, Duplicate → Linked/Merged, Fake → Rejected).' },
  { name: 'Government Accepted', responsibleRole: 'Government', responsibleOrg: 'Jharkhand Government', defaultDesc: 'Validated as a priority public interest challenge for solution development.' },
  { name: 'Recommended to University/HEI', responsibleRole: 'HEI/University', responsibleOrg: 'Partner HEI Network (e.g. BIT Mesra, NIT Jamshedpur)', defaultDesc: 'Matched with accredited Higher Education Institutions based on domain capabilities.' },
  { name: 'Faculty Assigned', responsibleRole: 'Faculty', responsibleOrg: 'University Innovation Faculty', defaultDesc: 'Lead faculty investigator appointed to supervise scientific/technical direction.' },
  { name: 'Student Team Formed', responsibleRole: 'Student Project Team', responsibleOrg: 'University Student Cohort', defaultDesc: 'Multidisciplinary student innovators assembled under faculty mentorship.' },
  { name: 'Problem Analysis Started', responsibleRole: 'Project Team', responsibleOrg: 'University Research Group', defaultDesc: 'Field assessments, local data collection, and stakeholder interviews initiated.' },
  { name: 'Resources Requested', responsibleRole: 'Project Team', responsibleOrg: 'ImpactForge Collaboration Exchange', defaultDesc: 'Identified capability gaps submitted for partner sponsorship and grants.' },
  { name: 'Partner Support Added', responsibleRole: 'Partner', responsibleOrg: 'CSR & Technical Partners', defaultDesc: 'Industry partners onboarded with equipment, funding, and mentorship commitments.' },
  { name: 'Prototype/Pilot Development', responsibleRole: 'Project Team', responsibleOrg: 'University Makerspace & Labs', defaultDesc: 'Working prototype or proof-of-concept built and laboratory tested.' },
  { name: 'Pilot Testing', responsibleRole: 'Project Team', responsibleOrg: 'District Pilot Site', defaultDesc: 'Field pilot active on-site with real community participants and sensors.' },
  { name: 'Deployment', responsibleRole: 'Government', responsibleOrg: 'District Administration & Community', defaultDesc: 'Full scale rollout installed and handed over for operational usage.' },
  { name: 'Problem Resolved', responsibleRole: 'Government', responsibleOrg: 'Jharkhand Government & Community', defaultDesc: 'Outcomes audited, performance metrics validated, and challenge closed.' },
  { name: 'Citizen Feedback', responsibleRole: 'Citizen', responsibleOrg: 'Reporting Citizen', defaultDesc: 'Citizen review submitted evaluating durability, usability, and satisfaction.' },
]

export function buildInitialStages(currentStageIndex: number, _baseDate = '2026-08-15'): TrackingStage[] {
  return DEFAULT_STAGE_CONFIG.map((cfg, index) => {
    let status: TrackingStage['status'] = 'Not Started'
    if (index < currentStageIndex) status = 'Completed'
    else if (index === currentStageIndex) status = 'In Progress'

    const dateOffset = index * 3
    const dateStr = `${Math.min(28, 10 + dateOffset)} Aug 2026`

    return {
      id: index + 1,
      name: cfg.name,
      status,
      date: index <= currentStageIndex ? dateStr : undefined,
      description: cfg.defaultDesc,
      responsibleRole: cfg.responsibleRole,
      responsibleOrg: cfg.responsibleOrg,
    }
  })
}

export const INITIAL_JHARKHAND_PROBLEMS: CitizenProblem[] = [
  {
    id: 'jh-problem-001',
    trackId: 'IF-JH-2026-0001',
    citizenId: 'mock-citizen',
    title: 'Arsenic and fluoride contamination in drinking water aquifers',
    description: 'Borewells across 4 panchayats in Ramgarh district show dangerously high arsenic and fluoride levels exceeding BIS limits, causing dental fluorosis among school students.',
    category: 'Water and Sanitation',
    location: 'Ramgarh, Jharkhand',
    state: 'Jharkhand',
    district: 'Ramgarh',
    locality: 'Patratu Block, Gola Road',
    landmark: 'Near Panchayat Bhavan, Patratu',
    latitude: 23.6300,
    longitude: 85.5100,
    status: 'Converted to Project',
    urgency: 'Critical',
    affectedPeople: 4800,
    submittedAt: '10 Aug 2026',
    lastUpdated: '28 Aug 2026',
    requiredCapabilities: ['Water filtration', 'Spectrometry sensing', 'Community water ATM'],
    currentStageIndex: 6, // Student Team Formed
    timelineStages: buildInitialStages(6, '2026-08-10'),
    requiredResources: [
      { id: 'r1', name: 'Testing Sensors & Ion Filters', category: 'Equipment', requiredQuantity: '4 filtration units', status: 'Partner Identified', provider: 'Tata Steel Foundation CSR' },
      { id: 'r2', name: 'Lab Water Quality Baseline Data', category: 'Data', requiredQuantity: 'Complete aquifer survey', status: 'Available', provider: 'Jharkhand Water Testing Lab, Ranchi' },
      { id: 'r3', name: 'Pilot Infrastructure Grant', category: 'Funding', requiredQuantity: '₹2,50,000', status: 'Partially Available', provider: 'State Innovation Fund' },
      { id: 'r4', name: 'Civil & Water Quality Mentors', category: 'Experts', requiredQuantity: '2 Faculty Advisors', status: 'Available', provider: 'BIT Mesra Department of Civil Eng.' },
    ],
    governmentComment: 'High priority public health alert. Validated by Ramgarh District Innovation Cell and forwarded to BIT Mesra water research team.',
  },
  {
    id: 'jh-problem-002',
    trackId: 'IF-JH-2026-0002',
    citizenId: 'mock-citizen',
    title: 'Decentralized solar cold storage for tribal vegetable farmers',
    description: 'Smallholder tribal farmers in Gumla lose up to 40% of tomato and green chili harvest during summer heat due to absence of affordable local cooling units.',
    category: 'Agriculture',
    location: 'Gumla, Jharkhand',
    state: 'Jharkhand',
    district: 'Gumla',
    locality: 'Bishunpur & Ghaghra Mandals',
    landmark: 'Weekly Haat Grounds, Bishunpur',
    latitude: 23.0440,
    longitude: 84.5420,
    status: 'Validated',
    urgency: 'High',
    affectedPeople: 2600,
    submittedAt: '15 Aug 2026',
    lastUpdated: '25 Aug 2026',
    requiredCapabilities: ['Solar microgrids', 'Thermal phase change materials', 'Agri-supply chain'],
    currentStageIndex: 3, // Government Accepted
    timelineStages: buildInitialStages(3, '2026-08-15'),
    requiredResources: [
      { id: 'r21', name: 'Solar PV Panels & Compressor Kit', category: 'Equipment', requiredQuantity: '5 kW system', status: 'Required', provider: 'Pending Partner Matching' },
      { id: 'r22', name: 'Storage Development Grant', category: 'Funding', requiredQuantity: '₹1,80,000', status: 'Required', provider: 'NABARD Rural Innovation' },
      { id: 'r23', name: 'Refrigeration Technology Mentors', category: 'Experts', requiredQuantity: '1 Solar Tech Expert', status: 'Available', provider: 'NIT Jamshedpur' },
    ],
    governmentComment: 'Validated by District Agriculture Officer. Approved for university engineering matching.',
  },
  {
    id: 'jh-problem-003',
    trackId: 'IF-JH-2026-0003',
    citizenId: 'mock-citizen',
    title: 'Off-grid telehealth connectivity for tribal health sub-centre',
    description: 'The sub-health centre in Netarhat plateau lacks cellular connectivity, making maternal emergency referrals and specialist telemedicine consultations impossible.',
    category: 'Healthcare',
    location: 'Latehar, Jharkhand',
    state: 'Jharkhand',
    district: 'Latehar',
    locality: 'Mahuadanr block, Netarhat Hills',
    landmark: 'Sub Health Centre, Near Netarhat School',
    latitude: 23.7430,
    longitude: 84.5020,
    status: 'Under Review',
    urgency: 'Critical',
    affectedPeople: 6200,
    submittedAt: '22 Aug 2026',
    lastUpdated: '24 Aug 2026',
    requiredCapabilities: ['Low-bandwidth telemedicine', 'LoRaWAN mesh networking', 'Offline electronic medical records'],
    currentStageIndex: 2, // Government Review
    timelineStages: buildInitialStages(2, '2026-08-22'),
    requiredResources: [
      { id: 'r31', name: 'Satellite/Mesh Radios', category: 'Equipment', requiredQuantity: '3 transceiver nodes', status: 'Required' },
      { id: 'r32', name: 'Telemedicine Tablet Software', category: 'Technology', requiredQuantity: '2 devices', status: 'Required' },
    ],
    governmentComment: 'Reviewing connectivity constraints with BSNL and District Health Society, Latehar.',
  },
  {
    id: 'jh-problem-004',
    trackId: 'IF-JH-2026-0004',
    citizenId: 'mock-citizen',
    title: 'Solar-powered bilingual digital learning kiosks in Santhal Pargana',
    description: 'Government middle schools in remote Dumka lack digital materials in Ol Chiki (Santhali) and Hindi, creating early dropouts among first-generation learners.',
    category: 'Education',
    location: 'Dumka, Jharkhand',
    state: 'Jharkhand',
    district: 'Dumka',
    locality: 'Shikaripara tribal cluster',
    landmark: 'Upgraded Middle School, Shikaripara',
    latitude: 24.2690,
    longitude: 87.2470,
    status: 'Converted to Project',
    urgency: 'Medium',
    affectedPeople: 1850,
    submittedAt: '01 Jul 2026',
    lastUpdated: '29 Aug 2026',
    requiredCapabilities: ['Offline educational tablets', 'Ol Chiki digital font support', 'Pedagogical content design'],
    currentStageIndex: 13, // Problem Resolved
    timelineStages: buildInitialStages(13, '2026-07-01'),
    requiredResources: [
      { id: 'r41', name: 'Ruggedized Android Tablets', category: 'Equipment', requiredQuantity: '15 units', status: 'Available', provider: 'Santhal Education Initiative' },
      { id: 'r42', name: 'Local Language Software', category: 'Technology', requiredQuantity: 'Offline App Suite', status: 'Available', provider: 'Jharkhand Tribal Research Institute' },
    ],
    citizenFeedback: {
      rating: 5,
      comment: 'The offline tablets with Santhali audio modules have transformed attendance in our class. Children are excited to learn!',
      problemSolved: 'yes',
      submittedAt: '28 Aug 2026',
    },
    governmentComment: 'Pilot successfully implemented and inspected by Dumka Education Department.',
  },
  {
    id: 'jh-problem-005',
    trackId: 'IF-JH-2026-0005',
    citizenId: 'user-other',
    title: 'Pedestrian overpass and intelligent speed warning near Namkum railway crossing',
    description: 'Heavy truck traffic on the highway near Namkum crossing causes frequent accidents for pedestrians and cyclists during morning school hours.',
    category: 'Public Safety',
    location: 'Ranchi, Jharkhand',
    state: 'Jharkhand',
    district: 'Ranchi',
    locality: 'Namkum Industrial Area',
    landmark: 'Namkum Railway Crossing, NH-33',
    latitude: 23.3441,
    longitude: 85.3096,
    status: 'Under Review',
    urgency: 'Critical',
    affectedPeople: 8500,
    submittedAt: '26 Aug 2026',
    lastUpdated: '26 Aug 2026',
    requiredCapabilities: ['Traffic volume monitoring', 'Computer vision speed detection', 'Civil road safety'],
    currentStageIndex: 2,
    timelineStages: buildInitialStages(2, '2026-08-26'),
    requiredResources: [
      { id: 'r51', name: 'Solar Speed Radar Displays', category: 'Equipment', requiredQuantity: '2 radar signs', status: 'Required' },
    ],
    governmentComment: 'Under joint review by Traffic Police and Road Construction Department, Ranchi.',
  },
]

export interface LanguageDictionary {
  dashboard: string
  reportProblem: string
  reportProblemNav: string
  myReports: string
  trackProblem: string
  problemDetails: string
  location: string
  submit: string
  cancel: string
  status: string
  notifications: string
  settings: string
  myProjects: string
  feedback: string
  profile: string
  searchPlaceholder: string
  requiredLocationPrompt: string
  trackIdLabel: string
  currentStatus: string
  requiredResources: string
  stageStatusCompleted: string
  stageStatusInProgress: string
  stageStatusPending: string
  stageStatusNotStarted: string
  filterDistrict: string
  selectDistrictPrompt: string
  addressLandmark: string
  copyTrackId: string
  trackProblemButton: string
  viewDetailsButton: string
  rateSolution: string
  solutionSolvedQuestion: string
  yesOption: string
  partiallyOption: string
  noOption: string
  submitFeedback: string
  feedbackSubmittedNotice: string
}

export const JHARKHAND_LANGUAGES: Record<
  JharkhandLanguage,
  { name: string; nativeName: string; dict: LanguageDictionary }
> = {
  en: {
    name: 'English',
    nativeName: 'English',
    dict: {
      dashboard: 'Citizen',
      reportProblem: 'Report a Problem',
      reportProblemNav: 'Report Problem',
      myReports: 'Reports',
      trackProblem: 'Track Problem',
      problemDetails: 'Problem Details',
      location: 'Location',
      submit: 'Report Problem',
      cancel: 'Cancel',
      status: 'Status',
      notifications: 'Alerts',
      settings: 'Settings',
      myProjects: 'Projects',
      feedback: 'Feedback',
      profile: 'Profile',
      searchPlaceholder: 'Search by Track ID or title...',
      requiredLocationPrompt: 'Please select a location within Jharkhand.',
      trackIdLabel: 'Track ID',
      currentStatus: 'Current Status',
      requiredResources: 'Required Resources',
      stageStatusCompleted: 'Completed',
      stageStatusInProgress: 'In Progress',
      stageStatusPending: 'Pending',
      stageStatusNotStarted: 'Not Started',
      filterDistrict: 'Select Jharkhand District',
      selectDistrictPrompt: 'Select a district...',
      addressLandmark: 'Address or Landmark',
      copyTrackId: 'Copy Track ID',
      trackProblemButton: 'Track Problem',
      viewDetailsButton: 'View Problem Details',
      rateSolution: 'Rate the implemented solution',
      solutionSolvedQuestion: 'Did this solution resolve the reported problem?',
      yesOption: 'Yes, fully resolved',
      partiallyOption: 'Partially resolved',
      noOption: 'No, problem remains',
      submitFeedback: 'Submit Citizen Feedback',
      feedbackSubmittedNotice: 'Thank you! Your feedback has been recorded for the Jharkhand governance audit.',
    },
  },
  hi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    dict: {
      dashboard: 'डैशबोर्ड',
      reportProblem: 'समस्या दर्ज करें',
      reportProblemNav: 'समस्या दर्ज करें',
      myReports: 'मेरी रिपोर्ट',
      trackProblem: 'समस्या ट्रैक करें',
      problemDetails: 'समस्या विवरण',
      location: 'स्थान (झारखण्ड)',
      submit: 'समस्या दर्ज करें',
      cancel: 'रद्द करें',
      status: 'स्थिति',
      notifications: 'सूचनाएं',
      settings: 'सेटिंग्स',
      myProjects: 'मेरे प्रोजेक्ट',
      feedback: 'प्रतिक्रिया',
      profile: 'प्रोफाइल',
      searchPlaceholder: 'ट्रैक आईडी या शीर्षक से खोजें...',
      requiredLocationPrompt: 'कृपया झारखण्ड के भीतर एक स्थान चुनें।',
      trackIdLabel: 'ट्रैक आईडी',
      currentStatus: 'वर्तमान स्थिति',
      requiredResources: 'आवश्यक संसाधन',
      stageStatusCompleted: 'पूर्ण',
      stageStatusInProgress: 'प्रगति पर',
      stageStatusPending: 'लंबित',
      stageStatusNotStarted: 'शुरू नहीं हुआ',
      filterDistrict: 'झारखण्ड जिला चुनें',
      selectDistrictPrompt: 'जिला चुनें...',
      addressLandmark: 'पता या मुख्य पहचान स्थल',
      copyTrackId: 'ट्रैक आईडी कॉपी करें',
      trackProblemButton: 'समस्या ट्रैक करें',
      viewDetailsButton: 'समस्या विवरण देखें',
      rateSolution: 'समाधान का मूल्यांकन करें',
      solutionSolvedQuestion: 'क्या इस समाधान से समस्या का निवारण हुआ?',
      yesOption: 'हाँ, पूर्ण निवारण',
      partiallyOption: 'आंशिक निवारण',
      noOption: 'नहीं, समस्या बनी हुई है',
      submitFeedback: 'नागरिक प्रतिक्रिया भेजें',
      feedbackSubmittedNotice: 'धन्यवाद! आपकी प्रतिक्रिया झारखण्ड प्रशासन रिकॉर्ड में दर्ज कर ली गई है।',
    },
  },
  nag: {
    name: 'Nagpuri',
    nativeName: 'नागपुरी (सादरी)',
    dict: {
      dashboard: 'डैशबोर्ड',
      reportProblem: 'समस्या दर्ज करू (Report)',
      reportProblemNav: 'समस्या दर्ज करू',
      myReports: 'हमार रिपोर्ट',
      trackProblem: 'समस्या खोजू / ट्रैक करू',
      problemDetails: 'समस्या कर हाल',
      location: 'झारखण्ड ठाँव (स्थान)',
      submit: 'समस्या दर्ज करू',
      cancel: 'छोड़ू',
      status: 'दशा / स्थिति',
      notifications: 'समाचार / सूचना',
      settings: 'सेटिंग्स',
      myProjects: 'हमार काम (प्रोजेक्ट)',
      feedback: 'विचार / सलाह',
      profile: 'प्रोफाइल',
      searchPlaceholder: 'ट्रैक आईडी से खोजू...',
      requiredLocationPrompt: 'झारखण्ड कर भीतरे ठाँव चुनू।',
      trackIdLabel: 'ट्रैक आईडी',
      currentStatus: 'एखन कर दशा',
      requiredResources: 'जरूरी सामान व साधन',
      stageStatusCompleted: 'होय गेलक (पूर्ण)',
      stageStatusInProgress: 'काम चालू आहे',
      stageStatusPending: 'बाकी आहे',
      stageStatusNotStarted: 'सुरु नइ भेल',
      filterDistrict: 'झारखण्ड जिला चुनू',
      selectDistrictPrompt: 'जिला चुनू...',
      addressLandmark: 'गाँव / टोला या पहचान',
      copyTrackId: 'आईडी कॉपी करू',
      trackProblemButton: 'समस्या ट्रैक करू',
      viewDetailsButton: 'पूरा हाल देखू',
      rateSolution: 'काम कइसन लागलक?',
      solutionSolvedQuestion: 'का समस्या कर समाधान भेलक?',
      yesOption: 'हँ, पूरा समाधान भेल',
      partiallyOption: 'थोड़ा-बहुत भेल',
      noOption: 'नइ, समस्या एखनो आहे',
      submitFeedback: 'विचार भेजूं',
      feedbackSubmittedNotice: 'धन्यवाद! रउरे कर विचार दर्ज होय गेलक।',
    },
  },
  sat: {
    name: 'Santhali',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ (संथाली)',
    dict: {
      dashboard: 'ᱰᱮᱥᱵᱳᱨᱰ (Dashboard)',
      reportProblem: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱞᱟᱹᱭ (Report Problem)',
      reportProblemNav: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱞᱟᱹᱭ',
      myReports: 'ᱤᱧᱟᱜ ᱨᱤᱯᱳᱨᱴ (My Reports)',
      trackProblem: 'ᱯᱟᱸᱡᱟ ᱧᱟᱢ (Track Problem)',
      problemDetails: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱵᱤᱵᱚᱨᱚᱬ',
      location: 'ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱴᱷᱟᱶ (Location)',
      submit: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱥᱚᱫᱚᱨ',
      cancel: 'ᱵᱟᱹᱜᱤ (Cancel)',
      status: 'ᱦᱟᱞᱚᱛ (Status)',
      notifications: 'ᱵᱟᱰᱟᱭ ᱡᱚᱝ (Notifications)',
      settings: 'ᱥᱟᱡᱟᱣ (Settings)',
      myProjects: 'ᱤᱧᱟᱜ ᱠᱟᱹᱢᱤ',
      feedback: 'ᱨᱟᱭ / ᱢᱚᱱᱚᱛ (Feedback)',
      profile: 'ᱯᱨᱳᱯᱷᱟᱭᱤᱞ',
      searchPlaceholder: 'ᱴᱨᱮᱠ ᱟᱭᱰᱤ ᱛᱮ ᱥᱮᱸᱫᱽᱨᱟᱭ ᱢᱮ...',
      requiredLocationPrompt: 'ᱫᱟᱭᱟ ᱠᱟᱛᱮ ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱵᱷᱤᱛᱨᱤ ᱨᱮᱱᱟᱜ ᱴᱷᱟᱶ ᱵᱟᱪᱷᱟᱣ ᱢᱮ᱾',
      trackIdLabel: 'ᱴᱨᱮᱠ ᱟᱭᱰᱤ',
      currentStatus: 'ᱱᱤᱛᱚᱜᱟᱜ ᱦᱟᱞᱚᱛ',
      requiredResources: 'ᱞᱟᱹᱠᱛᱤᱭᱟᱱ ᱥᱟᱯᱟᱵ ᱠᱚ',
      stageStatusCompleted: 'ᱪᱟᱵᱟ ᱮᱱᱟ',
      stageStatusInProgress: 'ᱪᱟᱞᱟᱜ ᱠᱟᱱᱟ',
      stageStatusPending: 'ᱛᱟᱺᱜᱤ ᱨᱮ',
      stageStatusNotStarted: 'ᱵᱟᱝ ᱮᱦᱚᱵ ᱟᱠᱟᱱᱟ',
      filterDistrict: 'ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱡᱤᱞᱟᱹ ᱵᱟᱪᱷᱟᱣ',
      selectDistrictPrompt: 'ᱡᱤᱞᱟᱹ ᱵᱟᱪᱷᱟᱣ ᱢᱮ...',
      addressLandmark: 'ᱟᱹᱛᱩ ᱟᱨ ᱴᱷᱤᱠᱟᱹᱱᱟ',
      copyTrackId: 'ᱟᱭᱰᱤ ᱱᱚᱠᱚᱞ',
      trackProblemButton: 'ᱯᱟᱸᱡᱟ ᱧᱟᱢ ᱢᱮ',
      viewDetailsButton: 'ᱯᱩᱨᱟᱹ ᱵᱤᱵᱚᱨᱚᱬ ᱧᱮᱞ',
      rateSolution: 'ᱠᱟᱹᱢᱤ ᱪᱮᱫ ᱞᱮᱠᱟ ᱦᱩᱭ ᱮᱱᱟ?',
      solutionSolvedQuestion: 'ᱪᱮᱫ ᱮᱴᱠᱮᱴᱚᱬᱮ ᱥᱟᱦᱟ ᱮᱱᱟ?',
      yesOption: 'ᱦᱮᱸ, ᱯᱩᱨᱟᱹ ᱥᱟᱦᱟ ᱮᱱᱟ',
      partiallyOption: 'ᱛᱷᱚᱲᱟ ᱜᱟᱱ',
      noOption: 'ᱵᱟᱝ, ᱢᱮᱱᱟᱜ ᱜᱮᱭᱟ',
      submitFeedback: 'ᱢᱚᱱᱚᱛ ᱵᱷᱮᱡᱟᱭ ᱢᱮ',
      feedbackSubmittedNotice: 'ᱥᱟᱨᱦᱟᱣ! ᱟᱢᱟᱜ ᱢᱚᱱᱚᱛ ᱨᱮᱠᱚᱨᱰ ᱮᱱᱟ᱾',
    },
  },
  kru: {
    name: 'Kurukh',
    nativeName: 'कुड़ुख़ (Kurukh)',
    dict: {
      dashboard: 'डैशबोर्ड',
      reportProblem: 'दुख/समस्या तेंगा (Report)',
      reportProblemNav: 'दुख/समस्या तेंगा',
      myReports: 'एंगहाई रिपोर्ट (My Reports)',
      trackProblem: 'समस्या बेदा (Track)',
      problemDetails: 'समस्या गही हाल',
      location: 'झारखण्ड अद्दा (Location)',
      submit: 'समस्या दर्ज नन्हा',
      cancel: 'अम्बके (Cancel)',
      status: 'दशा / हाल (Status)',
      notifications: 'सूचनार (Notifications)',
      settings: 'सेटिंग्स',
      myProjects: 'एंगहाई नलक (Projects)',
      feedback: 'राय / विचार (Feedback)',
      profile: 'प्रोफाइल',
      searchPlaceholder: 'Track ID ती बेदा...',
      requiredLocationPrompt: 'झारखण्ड गही अद्दा चुनके।',
      trackIdLabel: 'Track ID',
      currentStatus: 'इकुनम गही हाल',
      requiredResources: 'जरूरी समान',
      stageStatusCompleted: 'मंजरा (Completed)',
      stageStatusInProgress: 'मंजालगी (In Progress)',
      stageStatusPending: 'बाकी रही',
      stageStatusNotStarted: 'सुरु मल्ला',
      filterDistrict: 'झारखण्ड जिला चुनके',
      selectDistrictPrompt: 'जिला चुनके...',
      addressLandmark: 'पद्द / अद्दा गही पता',
      copyTrackId: 'ID नकल नन्हा',
      trackProblemButton: 'समस्या बेदा',
      viewDetailsButton: 'गोटंग हाल एरा',
      rateSolution: 'नलक एकसे लग्ग्या?',
      solutionSolvedQuestion: 'दुख मुंजरा का?',
      yesOption: 'हाँ, गोटंग मुंजरा',
      partiallyOption: 'जोग्गे मुंजरा',
      noOption: 'मल्ला, समस्या इकुनम रही',
      submitFeedback: 'विचार तैयके',
      feedbackSubmittedNotice: 'शुक्रिया! निंगहाई विचार दर्ज मंजरा।',
    },
  },
  mun: {
    name: 'Mundari',
    nativeName: 'मुण्डारी (Mundari)',
    dict: {
      dashboard: 'डैशबोर्ड',
      reportProblem: 'एतकेतोड़े ओल (Report Problem)',
      reportProblemNav: 'एतकेतोड़े ओल',
      myReports: 'आईंआ रिपोर्ट (My Reports)',
      trackProblem: 'समस्या नामे (Track Problem)',
      problemDetails: 'एतकेतोड़े ब्योरा',
      location: 'झारखण्ड जायगा (Location)',
      submit: 'दर्ज एमे (Submit)',
      cancel: 'बगी (Cancel)',
      status: 'हालत (Status)',
      notifications: 'खोबर (Notifications)',
      settings: 'सेटिंग्स',
      myProjects: 'आईंआ कामी (Projects)',
      feedback: 'सलाह / राय (Feedback)',
      profile: 'प्रोफाइल',
      searchPlaceholder: 'Track ID ते नामे...',
      requiredLocationPrompt: 'झारखण्ड भितरी जायगा सलाय मे।',
      trackIdLabel: 'Track ID',
      currentStatus: 'नाहाअ हालत',
      requiredResources: 'दरकार सामान को',
      stageStatusCompleted: 'होबाएना (Completed)',
      stageStatusInProgress: 'कामी चोलौताना',
      stageStatusPending: 'तांगी रे (Pending)',
      stageStatusNotStarted: 'का एहोब आकाना',
      filterDistrict: 'झारखण्ड जिला सलाय',
      selectDistrictPrompt: 'जिला सलाय मे...',
      addressLandmark: 'हातु आर ठिकना',
      copyTrackId: 'ID नकल एमे',
      trackProblemButton: 'समस्या नामे',
      viewDetailsButton: 'पूरी ब्योरा नेल',
      rateSolution: 'कामी चिलेका होबाएना?',
      solutionSolvedQuestion: 'चि एतकेतोड़े चाबाएना?',
      yesOption: 'हेँ, पूरी चाबाएना',
      partiallyOption: 'तोरंग चाबाएना',
      noOption: 'का, एतकेतोड़े मेनाअ गिया',
      submitFeedback: 'सलाह कुल एमे',
      feedbackSubmittedNotice: 'जोहार! आमाअ सलाह दर्ज एना।',
    },
  },
}

export interface ReportProblemFormTranslations {
  problemDetailsSectionTitle: string
  problemTitleLabel: string
  problemTitlePlaceholder: string
  problemTitleError: string
  descriptionLabel: string
  descriptionPlaceholder: string
  descriptionError: string
  descriptionMaxError: string
  descriptionCharCount: string
  categoryLabel: string
  categorySelectPrompt: string
  categoryError: string
  categories: Record<string, string>
  urgencyLabel: string
  urgencyLevels: Record<string, string>
  urgencyError: string
  affectedPeopleLabel: string
  affectedPeoplePlaceholder: string
  affectedPeopleError: string

  locationSectionTitle: string
  locationSectionSubtitle: string
  restrictedJharkhandBadge: string
  stateLabel: string
  districtLabel: string
  districtSelectPrompt: string
  districtError: string
  localityLabel: string
  localityPlaceholder: string
  landmarkLabel: string
  landmarkPlaceholder: string
  mapPrototypeTitle: string
  mapClickHint: string
  selectedCoordinatesLabel: string

  contextSectionTitle: string
  existingEffortsLabel: string
  existingEffortsPlaceholder: string
  expectedOutcomeLabel: string
  expectedOutcomePlaceholder: string

  supportingDocsSectionTitle: string
  supportingDocsSubtitle: string
  chooseFilesText: string
  uploadHint: string

  consentText: string
  consentError: string

  cancelButton: string
  viewReportsButton: string
  submitButton: string
  submittingButton: string
  reportingAsFooter: string

  successModalTitle: string
  successModalSubtitle: string
  successTrackIdLabel: string
  successTrackIdPrefix: string
  successSaveIdNotice: string
  successTitleLabel: string
  successSubmittedLabel: string
  successStatusLabel: string
  successStatusValue: string
  successLocationLabel: string
  copyTrackIdButton: string
  copiedButton: string
  trackProblemButton: string
}

export const REPORT_PROBLEM_TRANSLATIONS: Record<JharkhandLanguage, ReportProblemFormTranslations> = {
  en: {
    problemDetailsSectionTitle: 'Problem Details',
    problemTitleLabel: 'Problem title',
    problemTitlePlaceholder: 'Give the problem a clear, specific title (e.g. Drinking water fluorosis in Patratu)',
    problemTitleError: 'Problem title is required',
    descriptionLabel: 'Detailed problem description',
    descriptionPlaceholder: 'What is happening? Where and when does it happen? Who is affected?',
    descriptionError: 'Description is required',
    descriptionMaxError: 'Description must be 2000 characters or fewer',
    descriptionCharCount: 'characters',
    categoryLabel: 'Category',
    categorySelectPrompt: 'Select a category',
    categoryError: 'Category is required',
    categories: {
      'Water and Sanitation': 'Water and Sanitation',
      'Healthcare': 'Healthcare',
      'Education': 'Education',
      'Agriculture': 'Agriculture',
      'Environment': 'Environment',
      'Public Safety': 'Public Safety',
      'Accessibility': 'Accessibility',
      'Rural Development': 'Rural Development',
      'Digital Services': 'Digital Services',
      'Other': 'Other',
    },
    urgencyLabel: 'Urgency',
    urgencyLevels: {
      'Low': 'Low',
      'Medium': 'Medium',
      'High': 'High',
      'Critical': 'Critical',
    },
    urgencyError: 'Urgency is required',
    affectedPeopleLabel: 'Number of affected people (approximate)',
    affectedPeoplePlaceholder: 'e.g. 1500',
    affectedPeopleError: 'Enter zero or a positive number',

    locationSectionTitle: 'Location Selector (Jharkhand Only)',
    locationSectionSubtitle: 'Select your Jharkhand district and landmark. Click on the map to pinpoint the exact community location.',
    restrictedJharkhandBadge: 'Restricted to Jharkhand',
    stateLabel: 'State: Jharkhand (India)',
    districtLabel: 'Jharkhand District',
    districtSelectPrompt: 'Select a district...',
    districtError: 'Please select a location within Jharkhand.',
    localityLabel: 'Locality / Village / Town',
    localityPlaceholder: 'e.g. Patratu Block, Namkum, Chas',
    landmarkLabel: 'Address or Landmark',
    landmarkPlaceholder: 'e.g. Near Panchayat Bhavan / Main Road',
    mapPrototypeTitle: 'Interactive Map Prototype (Jharkhand Grid)',
    mapClickHint: 'Click map to place pin',
    selectedCoordinatesLabel: 'Selected Coordinates:',

    contextSectionTitle: 'Context and Desired Outcome',
    existingEffortsLabel: 'Existing efforts or attempted solutions',
    existingEffortsPlaceholder: 'What has your community or panchayat already tried?',
    expectedOutcomeLabel: 'Expected outcome',
    expectedOutcomePlaceholder: 'What would a practical, sustainable improvement look like?',

    supportingDocsSectionTitle: 'Optional Supporting Documents & Photos',
    supportingDocsSubtitle: 'Attach photographs, water test sheets, or community memorandums.',
    chooseFilesText: 'Choose images or documents',
    uploadHint: 'Mock prototype: files remain local to this session',

    consentText: 'I confirm that this community problem is within Jharkhand and can be shared for governance evaluation and university solution matching.',
    consentError: 'Consent is required',

    cancelButton: 'Cancel',
    viewReportsButton: 'Track Problem',
    submitButton: 'Report Problem',
    submittingButton: 'Registering...',
    reportingAsFooter: 'Reporting as',

    successModalTitle: 'Problem Reported Successfully',
    successModalSubtitle: 'Your problem has been reported successfully and registered in the Jharkhand State Innovation System.',
    successTrackIdLabel: 'Official Track ID (Permanent)',
    successTrackIdPrefix: 'Your Track ID is',
    successSaveIdNotice: 'Save this ID to follow live 15-stage resolution updates.',
    successTitleLabel: 'Problem Title:',
    successSubmittedLabel: 'Submitted:',
    successStatusLabel: 'Current Status:',
    successStatusValue: 'Problem Reported',
    successLocationLabel: 'Location:',
    copyTrackIdButton: 'Copy Track ID',
    copiedButton: 'Copied!',
    trackProblemButton: 'Track Problem',
  },
  hi: {
    problemDetailsSectionTitle: 'समस्या विवरण',
    problemTitleLabel: 'समस्या का शीर्षक',
    problemTitlePlaceholder: 'समस्या को एक स्पष्ट शीर्षक दें (उदा. पतरातू में पीने के पानी में फ्लोरोसिस)',
    problemTitleError: 'समस्या का शीर्षक आवश्यक है',
    descriptionLabel: 'विस्तृत समस्या विवरण',
    descriptionPlaceholder: 'क्या हो रहा है? कहाँ और कब होता है? कौन प्रभावित है?',
    descriptionError: 'विवरण आवश्यक है',
    descriptionMaxError: 'विवरण 2000 अक्षरों या उससे कम होना चाहिए',
    descriptionCharCount: 'अक्षर',
    categoryLabel: 'श्रेणी',
    categorySelectPrompt: 'एक श्रेणी चुनें',
    categoryError: 'श्रेणी चुनना आवश्यक है',
    categories: {
      'Water and Sanitation': 'जल एवं स्वच्छता',
      'Healthcare': 'स्वास्थ्य सेवा',
      'Education': 'शिक्षा',
      'Agriculture': 'कृषि',
      'Environment': 'पर्यावरण',
      'Public Safety': 'सार्वजनिक सुरक्षा',
      'Accessibility': 'सुगम्यता एवं दिव्यांगजन',
      'Rural Development': 'ग्रामीण विकास',
      'Digital Services': 'डिजिटल सेवाएं',
      'Other': 'अन्य',
    },
    urgencyLabel: 'तात्कालिकता',
    urgencyLevels: {
      'Low': 'निम्न',
      'Medium': 'मध्यम',
      'High': 'उच्च',
      'Critical': 'अति-गंभीर',
    },
    urgencyError: 'तात्कालिकता स्तर चुनना आवश्यक है',
    affectedPeopleLabel: 'प्रभावित लोगों की संख्या (अनुमानित)',
    affectedPeoplePlaceholder: 'उदा. 1500',
    affectedPeopleError: 'शून्य या धनात्मक संख्या दर्ज करें',

    locationSectionTitle: 'स्थान चयन (केवल झारखण्ड)',
    locationSectionSubtitle: 'अपना झारखण्ड जिला एवं स्थल चुनें। सटीक स्थान अंकित करने हेतु मानचित्र पर क्लिक करें।',
    restrictedJharkhandBadge: 'केवल झारखण्ड तक सीमित',
    stateLabel: 'राज्य: झारखण्ड (भारत)',
    districtLabel: 'झारखण्ड जिला',
    districtSelectPrompt: 'जिला चुनें...',
    districtError: 'कृपया झारखण्ड के भीतर एक स्थान चुनें।',
    localityLabel: 'इलाका / गाँव / कस्बा',
    localityPlaceholder: 'उदा. पतरातू ब्लॉक, नामकुम, चास',
    landmarkLabel: 'पता या मुख्य पहचान स्थल',
    landmarkPlaceholder: 'उदा. पंचायत भवन / मुख्य मार्ग के पास',
    mapPrototypeTitle: 'इंटरैक्टिव मानचित्र प्रोटोटाइप (झारखण्ड ग्रिड)',
    mapClickHint: 'पिन लगाने हेतु मानचित्र पर क्लिक करें',
    selectedCoordinatesLabel: 'चयनित निर्देशांक:',

    contextSectionTitle: 'संदर्भ एवं अपेक्षित परिणाम',
    existingEffortsLabel: 'पूर्व प्रयास या समाधान के प्रयास',
    existingEffortsPlaceholder: 'आपके समुदाय या पंचायत ने पहले क्या प्रयास किए हैं?',
    expectedOutcomeLabel: 'अपेक्षित परिणाम',
    expectedOutcomePlaceholder: 'व्यावहारिक और स्थायी समाधान कैसा दिखेगा?',

    supportingDocsSectionTitle: 'वैकल्पिक सहायक दस्तावेज़ एवं तस्वीरें',
    supportingDocsSubtitle: 'तस्वीरें, जल परीक्षण रिपोर्ट या सामुदायिक मांग पत्र संलग्न करें।',
    chooseFilesText: 'तस्वीरें या दस्तावेज़ चुनें',
    uploadHint: 'मॉक प्रोटोटाइप: फ़ाइलें इस सत्र में स्थानीय रहेंगी',

    consentText: 'मैं पुष्टि करता/करती हूँ कि यह समस्या झारखण्ड के भीतर है और शासन मूल्यांकन एवं विश्वविद्यालय समाधान हेतु साझा की जा सकती है।',
    consentError: 'सहमति आवश्यक है',

    cancelButton: 'रद्द करें',
    viewReportsButton: 'रिपोर्ट देखें',
    submitButton: 'समस्या दर्ज करें',
    submittingButton: 'दर्ज हो रहा है...',
    reportingAsFooter: 'दर्जकर्ता',

    successModalTitle: 'समस्या सफलतापूर्वक दर्ज हुई',
    successModalSubtitle: 'आपकी समस्या सफलतापूर्वक दर्ज कर ली गई है तथा झारखण्ड राज्य नवाचार प्रणाली में पंजीकृत है।',
    successTrackIdLabel: 'आधिकारिक ट्रैक आईडी (स्थायी)',
    successTrackIdPrefix: 'आपकी ट्रैक आईडी है',
    successSaveIdNotice: '15-चरणीय समाधान प्रगति देखने हेतु इस आईडी को सुरक्षित रखें।',
    successTitleLabel: 'समस्या शीर्षक:',
    successSubmittedLabel: 'दर्ज तिथि:',
    successStatusLabel: 'वर्तमान स्थिति:',
    successStatusValue: 'समस्या दर्ज हुई',
    successLocationLabel: 'स्थान:',
    copyTrackIdButton: 'ट्रैक आईडी कॉपी करें',
    copiedButton: 'कॉपी हो गया!',
    trackProblemButton: 'समस्या ट्रैक करें',
  },
  nag: {
    problemDetailsSectionTitle: 'समस्या कर हाल (Details)',
    problemTitleLabel: 'समस्या कर नाम / शीर्षक',
    problemTitlePlaceholder: 'समस्या कर साफ नाम लिखू (जइसे: पतरातू में पिएक पानी कर दिक्कत)',
    problemTitleError: 'समस्या कर शीर्षक जरूरी आहे',
    descriptionLabel: 'पूरा हाल (विवरण)',
    descriptionPlaceholder: 'का होवत आहे? कहाँ आउर कहिया होवेला? केकर पर असर पड़त आहे?',
    descriptionError: 'विवरण लिखेक जरूरी आहे',
    descriptionMaxError: 'विवरण 2000 अच्छर से कम होवेक चाही',
    descriptionCharCount: 'अक्षर',
    categoryLabel: 'वर्ग / श्रेणी',
    categorySelectPrompt: 'एकठो वर्ग चुनू',
    categoryError: 'वर्ग चुनू',
    categories: {
      'Water and Sanitation': 'पानी आउर सफाई',
      'Healthcare': 'दवा-दारू (स्वास्थ्य)',
      'Education': 'पढ़ाई-लिखाई (शिक्षा)',
      'Agriculture': 'खेती-बारी',
      'Environment': 'पर्यावरण',
      'Public Safety': 'सुरक्षा',
      'Accessibility': 'दिव्यांग सहायता',
      'Rural Development': 'गाँव कर विकास',
      'Digital Services': 'डिजिटल सेवा',
      'Other': 'दूसर',
    },
    urgencyLabel: 'कतना जरूरी आहे',
    urgencyLevels: {
      'Low': 'कम',
      'Medium': 'मझोला',
      'High': 'तेजी से',
      'Critical': 'तुरंते जरूरी',
    },
    urgencyError: 'ई जरूरी स्तर चुनू',
    affectedPeopleLabel: 'असरदार लोगन कर गिनती (लगभग)',
    affectedPeoplePlaceholder: 'जइसे 1500',
    affectedPeopleError: 'सही गिनती लिखू',

    locationSectionTitle: 'झारखण्ड ठाँव (स्थान चयन)',
    locationSectionSubtitle: 'अपन जिला आउर पहचान स्थल चुनू। नक्शा में दबाए के ठाँव पक्का करू।',
    restrictedJharkhandBadge: 'झारखण्ड सीमा भीतरे',
    stateLabel: 'राज्य: झारखण्ड (भारत)',
    districtLabel: 'झारखण्ड जिला',
    districtSelectPrompt: 'जिला चुनू...',
    districtError: 'झारखण्ड कर भीतरे ठाँव चुनू।',
    localityLabel: 'टोला / गाँव / शहर',
    localityPlaceholder: 'जइसे पतरातू, नामकुम, चास',
    landmarkLabel: 'गाँव / टोला या पहचान',
    landmarkPlaceholder: 'जइसे पंचायत भवन / बड़का सड़क तीरे',
    mapPrototypeTitle: 'नक्शा प्रोटोटाइप (झारखण्ड)',
    mapClickHint: 'नक्शा में पिन लगावेक ले क्लिक करू',
    selectedCoordinatesLabel: 'चुनाइल निर्देशांक:',

    contextSectionTitle: 'पहिल कर कोसिस आउर का चाही',
    existingEffortsLabel: 'पहिल का उपाय करल गेलक?',
    existingEffortsPlaceholder: 'गाँव या पंचायत पहिल का उपाय करलक?',
    expectedOutcomeLabel: 'का होवेक चाही?',
    expectedOutcomePlaceholder: 'कइसन सुधार होवेक चाही?',

    supportingDocsSectionTitle: 'फोटो आउर कागजात (चाहे तो)',
    supportingDocsSubtitle: 'फोटो, जांच रिपोर्ट या दरखास्त जोड़ू।',
    chooseFilesText: 'फोटो या फाइल चुनू',
    uploadHint: 'मॉक डेमो: फाइल स्थानीय रही',

    consentText: 'हम पक्का करत ही कि ई समस्या झारखण्ड कर भीतरे आहे आउर समाधान ले सरकार व विश्वविद्यालय के भेजल जा सकेला।',
    consentError: 'सहमति जरूरी आहे',

    cancelButton: 'छोड़ू',
    viewReportsButton: 'हमार रिपोर्ट',
    submitButton: 'समस्या दर्ज करू',
    submittingButton: 'दर्ज होवत आहे...',
    reportingAsFooter: 'दर्ज करइया',

    successModalTitle: 'समस्या दर्ज होय गेलक',
    successModalSubtitle: 'रउरे कर समस्या सफलतापूर्वक दर्ज होय गेलक आउर झारखण्ड प्रणाली में जुड़ गेलक।',
    successTrackIdLabel: 'सरकारी ट्रैक आईडी (स्थायी)',
    successTrackIdPrefix: 'रउरे कर ट्रैक आईडी आहे',
    successSaveIdNotice: '15 चरणीय सुधार देखेक ले ई आईडी राखू।',
    successTitleLabel: 'समस्या शीर्षक:',
    successSubmittedLabel: 'दर्ज तारीख:',
    successStatusLabel: 'एखन कर दशा:',
    successStatusValue: 'समस्या दर्ज भेल',
    successLocationLabel: 'ठाँव (स्थान):',
    copyTrackIdButton: 'आईडी कॉपी करू',
    copiedButton: 'कॉपी होय गेलक!',
    trackProblemButton: 'समस्या खोजू / ट्रैक करू',
  },
  sat: {
    problemDetailsSectionTitle: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱵᱤᱵᱚᱨᱚᱬ (Problem Details)',
    problemTitleLabel: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱧᱩᱛᱩᱢ (Title)',
    problemTitlePlaceholder: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱨᱮᱱᱟᱜ ᱥᱟᱯᱷᱟ ᱧᱩᱛᱩᱢ (ᱫᱟᱹᱭᱠᱟᱹ: ᱫᱟᱜ ᱨᱮ ᱵᱤᱥ ᱢᱮᱱᱟᱜ-ᱟ)',
    problemTitleError: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱧᱩᱛᱩᱢ ᱞᱟᱹᱠᱛᱤᱭᱟ',
    descriptionLabel: 'ᱯᱩᱨᱟᱹ ᱵᱤᱵᱚᱨᱚᱬ (Description)',
    descriptionPlaceholder: 'ᱪᱮᱫ ᱦᱩᱭᱩᱜ ᱠᱟᱱᱟ? ᱚᱠᱟᱨᱮ ᱟᱨ ᱛᱤᱥ? ᱚᱠᱚᱭ ᱠᱚ ᱦᱟᱨᱠᱮᱛᱚᱜ ᱠᱟᱱᱟ?',
    descriptionError: 'ᱵᱤᱵᱚᱨᱚᱬ ᱚᱞ ᱢᱮ',
    descriptionMaxError: '᱒᱐᱐᱐ ᱪᱤᱠᱤ ᱠᱷᱚᱱ ᱵᱟᱹᱲᱛᱤ ᱟᱞᱚᱢ ᱚᱞᱟ',
    descriptionCharCount: 'ᱪᱤᱠᱤ',
    categoryLabel: 'ᱛᱷᱚᱠ (Category)',
    categorySelectPrompt: 'ᱢᱤᱫᱴᱟᱹᱝ ᱛᱷᱚᱠ ᱵᱟᱪᱷᱟᱣ ᱢᱮ',
    categoryError: 'ᱛᱷᱚᱠ ᱵᱟᱪᱷᱟᱣ ᱞᱟᱹᱠᱛᱤᱭᱟ',
    categories: {
      'Water and Sanitation': 'ᱫᱟᱜ ᱟᱨ ᱯᱷᱟᱨᱪᱟ',
      'Healthcare': 'ᱦᱚᱲᱢᱚ ᱥᱟᱶᱟᱨ',
      'Education': 'ᱥᱮᱪᱮᱫ',
      'Agriculture': 'ᱪᱟᱥ-ᱵᱟᱥ',
      'Environment': 'ᱯᱚᱨᱤᱵᱮᱥ',
      'Public Safety': 'ᱨᱩᱠᱷᱤᱭᱟᱹ',
      'Accessibility': 'ᱵᱤᱥᱮᱥ ᱜᱚᱲᱚ',
      'Rural Development': 'ᱟᱹᱛᱩ ᱩᱛᱱᱟᱹᱣ',
      'Digital Services': 'ᱰᱤᱡᱤᱴᱟᱞ ᱥᱮᱣᱟ',
      'Other': 'ᱮᱴᱟᱜᱟᱜ',
    },
    urgencyLabel: 'ᱞᱟᱹᱠᱛᱤ (Urgency)',
    urgencyLevels: {
      'Low': 'ᱠᱚᱢ',
      'Medium': 'ᱛᱟᱞᱟᱢᱟᱞᱟ',
      'High': 'ᱞᱟᱹᱠᱛᱤᱭᱟᱱ',
      'Critical': 'ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱ',
    },
    urgencyError: 'ᱞᱟᱹᱠᱛᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ',
    affectedPeopleLabel: 'ᱦᱟᱨᱠᱮᱛᱚᱜ ᱦᱚᱲ ᱮᱞ (ᱞᱮᱠᱷᱟ)',
    affectedPeoplePlaceholder: 'ᱫᱟᱹᱭᱠᱟᱹ: ᱑᱕᱐᱐',
    affectedPeopleError: 'ᱥᱟᱹᱨᱤ ᱮᱞ ᱚᱞ ᱢᱮ',

    locationSectionTitle: 'ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱴᱷᱟᱶ (Location)',
    locationSectionSubtitle: 'ᱟᱢᱟᱜ ᱡᱤᱞᱟᱹ ᱟᱨ ᱴᱷᱤᱠᱟᱹᱱᱟ ᱵᱟᱪᱷᱟᱣ ᱢᱮ᱾ ᱱᱚᱠᱥᱟ ᱨᱮ ᱚᱛᱟᱭ ᱢᱮ᱾',
    restrictedJharkhandBadge: 'ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱵᱷᱤᱛᱨᱤ',
    stateLabel: 'ᱯᱚᱱᱚᱛ: ᱡᱷᱟᱨᱠᱷᱚᱸᱰ (ᱵᱷᱟᱨᱚᱛ)',
    districtLabel: 'ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱡᱤᱞᱟᱹ',
    districtSelectPrompt: 'ᱡᱤᱞᱟᱹ ᱵᱟᱪᱷᱟᱣ ᱢᱮ...',
    districtError: 'ᱫᱟᱭᱟ ᱠᱟᱛᱮ ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱵᱷᱤᱛᱨᱤ ᱨᱮᱱᱟᱜ ᱴᱷᱟᱶ ᱵᱟᱪᱷᱟᱣ ᱢᱮ᱾',
    localityLabel: 'ᱴᱚᱞᱟ / ᱟᱹᱛᱩ / ᱵᱟᱡᱟᱨ',
    localityPlaceholder: 'ᱫᱟᱹᱭᱠᱟᱹ: ᱯᱟᱛᱨᱟᱛᱩ, ᱱᱟᱢᱠᱩᱢ',
    landmarkLabel: 'ᱴᱷᱤᱠᱟᱹᱱᱟ / ᱩᱯᱨᱩᱢ',
    landmarkPlaceholder: 'ᱫᱟᱹᱭᱠᱟᱹ: ᱯᱚᱧᱪᱟᱭᱮᱛ ᱵᱷᱚᱵᱚᱱ ᱥᱩᱨ',
    mapPrototypeTitle: 'ᱱᱚᱠᱥᱟ (ᱡᱷᱟᱨᱠᱷᱚᱸᱰ)',
    mapClickHint: 'ᱯᱤᱱ ᱵᱟᱹᱭᱥᱟᱹᱣ ᱞᱟᱹᱜᱤᱫ ᱱᱚᱠᱥᱟ ᱨᱮ ᱚᱛᱟᱭ ᱢᱮ',
    selectedCoordinatesLabel: 'ᱵᱟᱪᱷᱟᱣᱟᱠᱟᱱ ᱴᱷᱟᱶ:',

    contextSectionTitle: 'ᱞᱟᱦᱟ ᱠᱩᱨᱩᱢᱩᱴᱩ ᱟᱨ ᱟᱸᱥ',
    existingEffortsLabel: 'ᱢᱟᱲᱟᱝ ᱨᱮ ᱪᱮᱫ ᱠᱩᱨᱩᱢᱩᱴᱩ ᱦᱩᱭ ᱞᱮᱱᱟ?',
    existingEffortsPlaceholder: 'ᱟᱹᱛᱩ ᱟᱨᱵᱟᱝ ᱯᱚᱧᱪᱟᱭᱮᱛ ᱪᱮᱫ ᱮ ᱠᱟᱹᱢᱤ ᱞᱮᱫ-ᱟ?',
    expectedOutcomeLabel: 'ᱪᱮᱫ ᱥᱚᱞᱦᱮ ᱦᱩᱭᱩᱜ ᱢᱟ?',
    expectedOutcomePlaceholder: 'ᱪᱮᱫ ᱞᱮᱠᱟᱱ ᱵᱮᱵᱚᱥᱛᱟ ᱞᱟᱹᱠᱛᱤ ᱠᱟᱱᱟ?',

    supportingDocsSectionTitle: 'ᱪᱤᱛᱟᱹᱨ ᱟᱨ ᱠᱟᱜᱚᱡᱽ ᱠᱚ',
    supportingDocsSubtitle: 'ᱯᱷᱳᱴᱳ ᱟᱨᱵᱟᱝ ᱫᱚᱨᱠᱷᱟᱥᱛ ᱡᱚᱲᱟᱣ ᱢᱮ᱾',
    chooseFilesText: 'ᱯᱷᱟᱭᱤᱞ ᱵᱟᱪᱷᱟᱣ ᱢᱮ',
    uploadHint: 'ᱢᱚᱠ ᱰᱮᱢᱳ: ᱱᱚᱸᱰᱮ ᱜᱮ ᱛᱟᱦᱮᱸᱱᱟ',

    consentText: 'ᱤᱧ ᱯᱟᱹᱛᱭᱟᱹᱣ ᱮᱢᱚᱜ ᱠᱟᱱᱟ ᱡᱮ ᱱᱚᱣᱟ ᱮᱴᱠᱮᱴᱚᱬᱮ ᱫᱚ ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱨᱮᱱᱟᱜ ᱠᱟᱱᱟ ᱟᱨ ᱥᱚᱞᱦᱮ ᱞᱟᱹᱜᱤᱫ ᱥᱚᱨᱠᱟᱨ ᱟᱨ ᱡᱮᱜᱮᱛ ᱵᱤᱨᱫᱟᱹᱜᱟᱲ ᱨᱮ ᱮᱢ ᱜᱟᱱᱚᱜ-ᱟ᱾',
    consentError: 'ᱦᱮᱸ ᱥᱤᱠᱟᱹᱨ ᱞᱟᱹᱠᱛᱤᱭᱟ',

    cancelButton: 'ᱵᱟᱹᱜᱤ (Cancel)',
    viewReportsButton: 'ᱤᱧᱟᱜ ᱨᱤᱯᱳᱨᱴ',
    submitButton: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱥᱚᱫᱚᱨ (Report)',
    submittingButton: 'ᱥᱚᱫᱚᱨᱚᱜ ᱠᱟᱱᱟ...',
    reportingAsFooter: 'ᱥᱚᱫᱚᱨᱤᱡ',

    successModalTitle: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱥᱟᱹᱛ ᱮᱱᱟ',
    successModalSubtitle: 'ᱟᱢᱟᱜ ᱮᱴᱠᱮᱴᱚᱬᱮ ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱯᱚᱱᱚᱛ ᱥᱤᱥᱴᱚᱢ ᱨᱮ ᱥᱟᱹᱛ ᱨᱮᱠᱚᱨᱰ ᱮᱱᱟ᱾',
    successTrackIdLabel: 'ᱴᱨᱮᱠ ᱟᱭᱰᱤ (Track ID)',
    successTrackIdPrefix: 'ᱟᱢᱟᱜ ᱴᱨᱮᱠ ᱟᱭᱰᱤ ᱫᱚ',
    successSaveIdNotice: '᱑᱕ ᱫᱷᱟᱯ ᱠᱟᱹᱢᱤ ᱯᱟᱸᱡᱟ ᱞᱟᱹᱜᱤᱫ ᱱᱚᱣᱟ ᱟᱭᱰᱤ ᱫᱚᱦᱚᱭ ᱢᱮ᱾',
    successTitleLabel: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱧᱩᱛᱩᱢ:',
    successSubmittedLabel: 'ᱥᱚᱫᱚᱨ ᱢᱟᱹᱦᱤᱛ:',
    successStatusLabel: 'ᱱᱤᱛᱚᱜᱟᱜ ᱦᱟᱞᱚᱛ:',
    successStatusValue: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱥᱚᱫᱚᱨ ᱮᱱᱟ',
    successLocationLabel: 'ᱴᱷᱟᱶ:',
    copyTrackIdButton: 'ᱟᱭᱰᱤ ᱱᱚᱠᱚᱞ (Copy)',
    copiedButton: 'ᱱᱚᱠᱚᱞ ᱮᱱᱟ!',
    trackProblemButton: 'ᱯᱟᱸᱡᱟ ᱧᱟᱢ (Track)',
  },
  kru: {
    problemDetailsSectionTitle: 'समस्या गही हाल (Problem Details)',
    problemTitleLabel: 'समस्या गही नाम (Title)',
    problemTitlePlaceholder: 'समस्या गही सफा नाम तेंगा (उदा. पतरातू नू अम गही दुख)',
    problemTitleError: 'समस्या गही नाम जरूरी रही',
    descriptionLabel: 'गोटंग हाल (Description)',
    descriptionPlaceholder: 'एका से मंजा? एकसन आउर एकबेरा? नेकहा असर परिया?',
    descriptionError: 'हाल तेंगा जरूरी रही',
    descriptionMaxError: '2000 अखर ती कम चाही',
    descriptionCharCount: 'अक्षर',
    categoryLabel: 'वर्ग (Category)',
    categorySelectPrompt: 'वर्ग चुनके',
    categoryError: 'वर्ग चुनके जरूरी',
    categories: {
      'Water and Sanitation': 'अम आउर सफा',
      'Healthcare': 'दवा-दारू',
      'Education': 'पढ़ाई',
      'Agriculture': 'खेती-बारी',
      'Environment': 'पर्यावरण',
      'Public Safety': 'सुरक्षा',
      'Accessibility': 'दिव्यांग गही मदद',
      'Rural Development': 'पद्दा विकास',
      'Digital Services': 'डिजिटल सेवा',
      'Other': 'दूसर',
    },
    urgencyLabel: 'अति जरूरी (Urgency)',
    urgencyLevels: {
      'Low': 'कम',
      'Medium': 'मंझिला',
      'High': 'बगा',
      'Critical': 'तुरंते',
    },
    urgencyError: 'ई चुनके जरूरी',
    affectedPeopleLabel: 'प्रभावित आलर गही गिनती',
    affectedPeoplePlaceholder: 'उदा. 1500',
    affectedPeopleError: 'सही गिनती तेंगा',

    locationSectionTitle: 'झारखण्ड अद्दा (Location Selector)',
    locationSectionSubtitle: 'अपन जिला आउर अद्दा चुनके। नक्शा नू पिन बइठाईके अद्दा तेंगा।',
    restrictedJharkhandBadge: 'झारखण्ड भीतरी',
    stateLabel: 'राज्य: झारखण्ड (भारत)',
    districtLabel: 'झारखण्ड जिला',
    districtSelectPrompt: 'जिला चुनके...',
    districtError: 'झारखण्ड गही अद्दा चुनके।',
    localityLabel: 'टोला / पद्द / शहर',
    localityPlaceholder: 'उदा. पतरातू, नामकुम',
    landmarkLabel: 'पद्द / अद्दा गही पता',
    landmarkPlaceholder: 'उदा. पंचायत भवन / डहरे ती',
    mapPrototypeTitle: 'नक्शा प्रोटोटाइप (झारखण्ड)',
    mapClickHint: 'पिन बइठाईके ले नक्शा नू क्लिक नन्हा',
    selectedCoordinatesLabel: 'चुनेका अद्दा निर्देशांक:',

    contextSectionTitle: 'पहिली गही कोसिस आउर का चाही',
    existingEffortsLabel: 'पहिली का उपाय नंजरा?',
    existingEffortsPlaceholder: 'पद्दा या पंचायत पहिली का उपाय नंजा?',
    expectedOutcomeLabel: 'का मंजना चाही?',
    expectedOutcomePlaceholder: 'एका से समाधान चाही?',

    supportingDocsSectionTitle: 'फोटो आउर कागद',
    supportingDocsSubtitle: 'फोटो या दरखास्त कागद जोड़के।',
    chooseFilesText: 'फोटो / फाइल चुनके',
    uploadHint: 'मॉक डेमो: फाइल ईसन रही',

    consentText: 'एन पक्का नन्दन कि ई समस्या झारखण्ड गही भीतरी रही आउर समाधान ले सरकार आउर कॉलेज ती साझा नंज्रा।',
    consentError: 'सहमति जरूरी रही',

    cancelButton: 'अम्बके (Cancel)',
    viewReportsButton: 'एंगहाई रिपोर्ट',
    submitButton: 'समस्या दर्ज नन्हा',
    submittingButton: 'दर्ज मंजालगी...',
    reportingAsFooter: 'दर्ज नन्हू',

    successModalTitle: 'समस्या दर्ज मंजरा',
    successModalSubtitle: 'निंगहाई समस्या झारखण्ड सिस्टम नू दर्ज मंजरा।',
    successTrackIdLabel: 'सरकारी ट्रैक आईडी (Track ID)',
    successTrackIdPrefix: 'निंगहाई ट्रैक आईडी रही',
    successSaveIdNotice: '15 पायरी काम एरा ले ई आईडी सम्हारके।',
    successTitleLabel: 'समस्या शीर्षक:',
    successSubmittedLabel: 'दर्ज तारीख:',
    successStatusLabel: 'इकुनम गही हाल:',
    successStatusValue: 'समस्या दर्ज मंजरा',
    successLocationLabel: 'अद्दा (ठाँव):',
    copyTrackIdButton: 'ID नकल नन्हा',
    copiedButton: 'नकल मंजरा!',
    trackProblemButton: 'समस्या बेदा (Track)',
  },
  mun: {
    problemDetailsSectionTitle: 'एतकेतोड़े ब्योरा (Problem Details)',
    problemTitleLabel: 'एतकेतोड़े नुतुम (Title)',
    problemTitlePlaceholder: 'एतकेतोड़े साफा नुतुम ओल मे (जइसे: पतरातू रे दाअ रे फ्लोरोसिस)',
    problemTitleError: 'एतकेतोड़े नुतुम दरकार गिया',
    descriptionLabel: 'पूरी ब्योरा (Description)',
    descriptionPlaceholder: 'चिकना होबाओताना? ओकोरे आर चिमतान? कोए को दुःख रे मेनाअ कोआ?',
    descriptionError: 'ब्योरा ओल दरकार',
    descriptionMaxError: '2000 आखर ले कम चाही',
    descriptionCharCount: 'आखर',
    categoryLabel: 'श्रेणी (Category)',
    categorySelectPrompt: 'मित श्रेणी सलाय मे',
    categoryError: 'श्रेणी सलाय दरकार',
    categories: {
      'Water and Sanitation': 'दाअ आर साफा',
      'Healthcare': 'हड़मो बोगो',
      'Education': 'ओल-पड़ाव',
      'Agriculture': 'चास-बास',
      'Environment': 'पर्यावरण',
      'Public Safety': 'रुकिया',
      'Accessibility': 'दिव्यांग गोड़ो',
      'Rural Development': 'हातु बिकास',
      'Digital Services': 'डिजिटल सेवा',
      'Other': 'एटाअ',
    },
    urgencyLabel: 'दरकार (Urgency)',
    urgencyLevels: {
      'Low': 'कम',
      'Medium': 'माझम',
      'High': 'तेज',
      'Critical': 'तुरते चाही',
    },
    urgencyError: 'दरकार सलाय मे',
    affectedPeopleLabel: 'दुःख पड़ाय होड़ो को (गिनती)',
    affectedPeoplePlaceholder: 'जइसे 1500',
    affectedPeopleError: 'सही गिनती ओल मे',

    locationSectionTitle: 'झारखण्ड जायगा (Location Selector)',
    locationSectionSubtitle: 'आमाअ जिला आर हातु सलाय मे। नक्शा रे पिन एमे।',
    restrictedJharkhandBadge: 'झारखण्ड भितरी',
    stateLabel: 'राज्य: झारखण्ड (भारत)',
    districtLabel: 'झारखण्ड जिला',
    districtSelectPrompt: 'जिला सलाय मे...',
    districtError: 'झारखण्ड भितरी जायगा सलाय मे।',
    localityLabel: 'टोला / हातु / बाजार',
    localityPlaceholder: 'जइसे पतरातू, नामकुम',
    landmarkLabel: 'हातु आर ठिकना',
    landmarkPlaceholder: 'जइसे पंचायत भवन / सड़क जपारे',
    mapPrototypeTitle: 'नक्शा प्रोटोटाइप (झारखण्ड)',
    mapClickHint: 'पिन बइठाव लगिड नक्शा रे ओताय मे',
    selectedCoordinatesLabel: 'सलाय आकाना निर्देशांक:',

    contextSectionTitle: 'माड़ांग कोसिस आर आसा',
    existingEffortsLabel: 'माड़ांग चिनाअ उपाय होबाएना?',
    existingEffortsPlaceholder: 'हातु आर पंचायत चिनाअ उपाय को नंजा?',
    expectedOutcomeLabel: 'चिकना सुधार चाही?',
    expectedOutcomePlaceholder: 'चिलेका समाधान चाही?',

    supportingDocsSectionTitle: 'फोटो आर कागजात को',
    supportingDocsSubtitle: 'फोटो या दरखास्त कागजात मेसा मे।',
    chooseFilesText: 'फोटो / फाइल सलाय मे',
    uploadHint: 'मॉक डेमो: फाइल नेनेगे ताइना',

    consentText: 'आईंङ साच्चे मेनताना चि ने एतकेतोड़े झारखण्ड भितरी आकाना आर समाधान लगिड सरकार आर कॉलेज को रे कुल दायोआ।',
    consentError: 'सहमति दरकार गिया',

    cancelButton: 'बगी (Cancel)',
    viewReportsButton: 'आईंआ रिपोर्ट',
    submitButton: 'दर्ज एमे (Report)',
    submittingButton: 'दर्ज ओताना...',
    reportingAsFooter: 'दर्ज तानी',

    successModalTitle: 'एतकेतोड़े दर्ज एना',
    successModalSubtitle: 'आमाअ एतकेतोड़े झारखण्ड सिस्टम रे बेसते दर्ज एना।',
    successTrackIdLabel: 'सरकारी ट्रैक आईडी (Track ID)',
    successTrackIdPrefix: 'आमाअ ट्रैक आईडी ताना',
    successSaveIdNotice: '15 पायरी कामी नेल लगिड ने आईडी दोहोय मे।',
    successTitleLabel: 'एतकेतोड़े नुतुम:',
    successSubmittedLabel: 'दर्ज तारीख:',
    successStatusLabel: 'नाहाअ हालत:',
    successStatusValue: 'एतकेतोड़े दर्ज एना',
    successLocationLabel: 'जायगा:',
    copyTrackIdButton: 'ID नकल एमे',
    copiedButton: 'नकल एना!',
    trackProblemButton: 'समस्या नामे (Track)',
  },
}
