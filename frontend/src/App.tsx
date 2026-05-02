import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ContactsPage from './pages/contacts/ContactsPage';
import InboxesPage from './pages/inboxes/InboxesPage';
import InboxFormPage from './pages/inboxes/InboxFormPage';
import ConversationsPage from './pages/conversations/ConversationsPage';
import LabelsPage from './pages/labels/LabelsPage';
import CannedResponsesPage from './pages/canned-responses/CannedResponsesPage';
import TeamsPage from './pages/teams/TeamsPage';
import ReportsPage from './pages/reports/ReportsPage';
import AutomationsPage from './pages/automations/AutomationsPage';
import CsatPage from './pages/csat/CsatPage';
import SurveyPage from './pages/csat/SurveyPage';
import ProfileSettingsPage from './pages/settings/ProfileSettingsPage';
import AccountSettingsPage from './pages/settings/AccountSettingsPage';
import WhatsAppTemplatesPage from './pages/whatsapp-templates/WhatsAppTemplatesPage';
import BroadcastsPage from './pages/broadcasts/BroadcastsPage';
import BroadcastFormPage from './pages/broadcasts/BroadcastFormPage';
import ChatbotFlowsPage from './pages/chatbot/ChatbotFlowsPage';
import ChatbotFlowFormPage from './pages/chatbot/ChatbotFlowFormPage';
import ChatbotFlowBuilderPage from './pages/chatbot/ChatbotFlowBuilderPage';
import CampaignAnalyticsPage from './pages/campaign-analytics/CampaignAnalyticsPage';
import ScheduledMessagesPage from './pages/scheduled-messages/ScheduledMessagesPage';
import ConsentManagementPage from './pages/consent/ConsentManagementPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/survey/:token" element={<SurveyPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout><DashboardPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/conversations"
            element={
              <ProtectedRoute>
                <Layout><ConversationsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <Layout><ContactsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inboxes"
            element={
              <ProtectedRoute>
                <Layout><InboxesPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inboxes/new"
            element={
              <ProtectedRoute>
                <Layout><InboxFormPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/labels"
            element={
              <ProtectedRoute>
                <Layout><LabelsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/canned-responses"
            element={
              <ProtectedRoute>
                <Layout><CannedResponsesPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <Layout><TeamsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout><ReportsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/automations"
            element={
              <ProtectedRoute>
                <Layout><AutomationsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/csat"
            element={
              <ProtectedRoute>
                <Layout><CsatPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <Layout><ChatbotFlowsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot/new"
            element={
              <ProtectedRoute>
                <Layout><ChatbotFlowFormPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot/builder/:flowId"
            element={
              <ProtectedRoute>
                <Layout><ChatbotFlowBuilderPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/broadcasts"
            element={
              <ProtectedRoute>
                <Layout><BroadcastsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/broadcasts/new"
            element={
              <ProtectedRoute>
                <Layout><BroadcastFormPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaign-analytics"
            element={
              <ProtectedRoute>
                <Layout><CampaignAnalyticsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduled-messages"
            element={
              <ProtectedRoute>
                <Layout><ScheduledMessagesPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/consent"
            element={
              <ProtectedRoute>
                <Layout><ConsentManagementPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whatsapp-templates"
            element={
              <ProtectedRoute>
                <Layout><WhatsAppTemplatesPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/profile"
            element={
              <ProtectedRoute>
                <Layout><ProfileSettingsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/account"
            element={
              <ProtectedRoute>
                <Layout><AccountSettingsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
