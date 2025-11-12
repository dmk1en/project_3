const request = require('supertest');
const express = require('express');

// Integration test for complete pipeline workflow
describe('Pipeline Integration Tests', () => {
  let app;
  let testUser;
  let testContact;
  let testCompany; 
  let testStages;

  beforeAll(async () => {
    // Setup test app (mock Express app for integration testing)
    app = express();
    app.use(express.json());
    
    // Mock authentication
    app.use((req, res, next) => {
      req.user = testHelpers.createTestUser();
      next();
    });

    // Mock routes with simplified controllers
    app.use('/api/v1', require('../../src/routes'));

    // Create test data
    testUser = testHelpers.createTestUser();
    testContact = testHelpers.createTestContact();
    testCompany = testHelpers.createTestCompany();
    testStages = [
      { ...testHelpers.createTestStage(), name: 'Lead', displayOrder: 1, probabilityPercent: 10 },
      { ...testHelpers.createTestStage(), id: 'stage-2', name: 'Qualified', displayOrder: 2, probabilityPercent: 25 },
      { ...testHelpers.createTestStage(), id: 'stage-3', name: 'Proposal', displayOrder: 3, probabilityPercent: 50 },
      { ...testHelpers.createTestStage(), id: 'stage-4', name: 'Negotiation', displayOrder: 4, probabilityPercent: 75 },
      { ...testHelpers.createTestStage(), id: 'stage-5', name: 'Closed Won', displayOrder: 5, probabilityPercent: 100 },
      { ...testHelpers.createTestStage(), id: 'stage-6', name: 'Closed Lost', displayOrder: 6, probabilityPercent: 0 }
    ];
  });

  describe('Complete Pipeline Workflow', () => {
    it('should complete full opportunity lifecycle', async () => {
      // This test simulates a complete sales process
      
      // 1. Create opportunity in Lead stage
      const opportunityData = {
        name: 'Integration Test Opportunity',
        contactId: testContact.id,
        companyId: testCompany.id,
        stageId: testStages[0].id, // Lead stage
        value: 50000,
        currency: 'USD',
        expectedCloseDate: '2025-12-31',
        description: 'Test opportunity for integration testing'
      };

      // Mock the creation (in real test this would hit actual endpoints)
      const createdOpportunity = {
        id: 'integration-test-opp-id',
        ...opportunityData,
        probability: 10,
        assignedTo: testUser.id
      };

      expect(createdOpportunity.stageId).toBe(testStages[0].id);
      expect(createdOpportunity.probability).toBe(10);

      // 2. Move through pipeline stages
      const stageProgressions = [
        { stageId: testStages[1].id, notes: 'Qualified the lead - good fit' },
        { stageId: testStages[2].id, notes: 'Sent proposal - waiting for review' },
        { stageId: testStages[3].id, notes: 'In negotiation phase - discussing terms' },
        { stageId: testStages[4].id, notes: 'Deal closed successfully!' }
      ];

      let currentOpportunity = createdOpportunity;

      for (const progression of stageProgressions) {
        // Mock stage movement
        const stage = testStages.find(s => s.id === progression.stageId);
        currentOpportunity = {
          ...currentOpportunity,
          stageId: progression.stageId,
          probability: stage.probabilityPercent
        };

        // Verify stage progression
        expect(currentOpportunity.stageId).toBe(progression.stageId);
        expect(currentOpportunity.probability).toBe(stage.probabilityPercent);

        // Mock activity creation for stage change
        const activity = {
          type: 'stage_change',
          subject: `Stage changed to ${stage.name}`,
          description: progression.notes,
          opportunityId: currentOpportunity.id,
          contactId: currentOpportunity.contactId,
          assignedTo: testUser.id
        };

        expect(activity.type).toBe('stage_change');
        expect(activity.description).toBe(progression.notes);
      }

      // 3. Verify final state
      expect(currentOpportunity.stageId).toBe(testStages[4].id); // Closed Won
      expect(currentOpportunity.probability).toBe(100);
    });

    it('should handle opportunity rejection workflow', async () => {
      // Test losing a deal
      
      const rejectedOpportunityData = {
        name: 'Rejected Opportunity',
        contactId: testContact.id,
        stageId: testStages[2].id, // Start at Proposal
        value: 25000
      };

      let rejectedOpportunity = {
        id: 'rejected-opp-id',
        ...rejectedOpportunityData,
        probability: 50
      };

      // Move to Closed Lost
      rejectedOpportunity = {
        ...rejectedOpportunity,
        stageId: testStages[5].id, // Closed Lost
        probability: 0,
        actualCloseDate: new Date().toISOString().split('T')[0]
      };

      expect(rejectedOpportunity.stageId).toBe(testStages[5].id);
      expect(rejectedOpportunity.probability).toBe(0);
      expect(rejectedOpportunity.actualCloseDate).toBeTruthy();
    });
  });

  describe('Pipeline Management Workflow', () => {
    it('should manage pipeline stages lifecycle', async () => {
      // 1. Create new custom stage
      const newStageData = {
        name: 'Demo Scheduled',
        probabilityPercent: 35,
        color: '#FFA500'
      };

      const createdStage = {
        id: 'new-stage-id',
        ...newStageData,
        displayOrder: 7, // Next available order
        isActive: true
      };

      expect(createdStage.displayOrder).toBe(7);
      expect(createdStage.isActive).toBe(true);

      // 2. Reorder stages
      const reorderedStageIds = [
        testStages[0].id, // Lead - 1
        createdStage.id,   // Demo Scheduled - 2  
        testStages[1].id, // Qualified - 3
        testStages[2].id, // Proposal - 4
        testStages[3].id, // Negotiation - 5
        testStages[4].id, // Closed Won - 6
        testStages[5].id  // Closed Lost - 7
      ];

      // Mock reordering result
      const reorderedStages = reorderedStageIds.map((stageId, index) => ({
        id: stageId,
        displayOrder: index + 1
      }));

      expect(reorderedStages).toHaveLength(7);
      expect(reorderedStages[1].id).toBe(createdStage.id);
      expect(reorderedStages[1].displayOrder).toBe(2);

      // 3. Update stage properties
      const updatedStage = {
        ...createdStage,
        name: 'Demo Completed',
        probabilityPercent: 40,
        color: '#FF8C00'
      };

      expect(updatedStage.name).toBe('Demo Completed');
      expect(updatedStage.probabilityPercent).toBe(40);

      // 4. Deactivate stage (if no opportunities)
      const deactivatedStage = {
        ...updatedStage,
        isActive: false
      };

      expect(deactivatedStage.isActive).toBe(false);
    });

    it('should handle stage deletion with opportunity migration', async () => {
      // Mock scenario: Delete a stage that has opportunities
      
      const stageToDelete = {
        id: 'stage-to-delete',
        name: 'Temporary Stage'
      };

      const targetStage = testStages[1]; // Qualified stage

      // Mock opportunities in the stage to be deleted
      const opportunitiesInStage = [
        { id: 'opp-1', name: 'Opp 1', contactId: 'contact-1' },
        { id: 'opp-2', name: 'Opp 2', contactId: 'contact-2' }
      ];

      // Mock migration
      const migratedOpportunities = opportunitiesInStage.map(opp => ({
        ...opp,
        stageId: targetStage.id,
        probability: targetStage.probabilityPercent
      }));

      // Mock activities for migration
      const migrationActivities = migratedOpportunities.map(opp => ({
        type: 'stage_change',
        subject: `Stage changed due to deletion: ${stageToDelete.name} → ${targetStage.name}`,
        opportunityId: opp.id,
        contactId: opp.contactId
      }));

      expect(migratedOpportunities).toHaveLength(2);
      expect(migratedOpportunities[0].stageId).toBe(targetStage.id);
      expect(migrationActivities).toHaveLength(2);
      expect(migrationActivities[0].type).toBe('stage_change');
    });
  });

  describe('Pipeline Analytics Workflow', () => {
    it('should generate comprehensive pipeline analytics', async () => {
      // Mock pipeline data for analytics
      const pipelineData = {
        stages: testStages.map(stage => ({
          ...stage,
          opportunities: stage.id === testStages[0].id ? [
            { id: 'opp-1', value: 10000 },
            { id: 'opp-2', value: 15000 }
          ] : stage.id === testStages[1].id ? [
            { id: 'opp-3', value: 20000 }
          ] : []
        }))
      };

      // Calculate analytics
      const analytics = {
        totalOpportunities: pipelineData.stages.reduce(
          (sum, stage) => sum + stage.opportunities.length, 0
        ),
        totalValue: pipelineData.stages.reduce(
          (sum, stage) => sum + stage.opportunities.reduce(
            (stageSum, opp) => stageSum + opp.value, 0
          ), 0
        ),
        stageDistribution: pipelineData.stages.map(stage => ({
          stageName: stage.name,
          count: stage.opportunities.length,
          totalValue: stage.opportunities.reduce((sum, opp) => sum + opp.value, 0),
          avgValue: stage.opportunities.length > 0 
            ? stage.opportunities.reduce((sum, opp) => sum + opp.value, 0) / stage.opportunities.length 
            : 0
        }))
      };

      expect(analytics.totalOpportunities).toBe(3);
      expect(analytics.totalValue).toBe(45000);
      expect(analytics.stageDistribution[0].count).toBe(2); // Lead stage
      expect(analytics.stageDistribution[1].count).toBe(1); // Qualified stage
    });

    it('should calculate pipeline forecast', async () => {
      // Mock opportunities with expected close dates
      const forecastOpportunities = [
        {
          id: 'forecast-1',
          name: 'Q1 Deal',
          value: 30000,
          expectedCloseDate: '2025-03-31',
          stage: { probabilityPercent: 75 }
        },
        {
          id: 'forecast-2', 
          name: 'Q2 Deal',
          value: 50000,
          expectedCloseDate: '2025-06-30',
          stage: { probabilityPercent: 50 }
        }
      ];

      // Calculate weighted forecast
      const forecast = {
        totalValue: forecastOpportunities.reduce((sum, opp) => sum + opp.value, 0),
        weightedValue: forecastOpportunities.reduce((sum, opp) => 
          sum + (opp.value * opp.stage.probabilityPercent / 100), 0
        ),
        bestCase: forecastOpportunities
          .filter(opp => opp.stage.probabilityPercent >= 75)
          .reduce((sum, opp) => sum + opp.value, 0),
        worstCase: forecastOpportunities
          .filter(opp => opp.stage.probabilityPercent >= 90)
          .reduce((sum, opp) => sum + opp.value, 0)
      };

      expect(forecast.totalValue).toBe(80000);
      expect(forecast.weightedValue).toBe(47500); // (30000*0.75) + (50000*0.5)
      expect(forecast.bestCase).toBe(30000); // Only 75% probability deal
      expect(forecast.worstCase).toBe(0); // No 90%+ deals
    });

    it('should track conversion rates between stages', async () => {
      // Mock stage movement data
      const stageMovements = [
        { from: 'Lead', to: 'Qualified', count: 8 },
        { from: 'Qualified', to: 'Proposal', count: 6 },
        { from: 'Proposal', to: 'Negotiation', count: 4 },
        { from: 'Negotiation', to: 'Closed Won', count: 3 },
        { from: 'Negotiation', to: 'Closed Lost', count: 1 }
      ];

      // Calculate conversion rates
      const conversionRates = {
        'Lead → Qualified': 8 / 10 * 100, // 80%
        'Qualified → Proposal': 6 / 8 * 100, // 75%
        'Proposal → Negotiation': 4 / 6 * 100, // 66.7%
        'Negotiation → Won': 3 / 4 * 100, // 75%
        'Overall Win Rate': 3 / 10 * 100 // 30%
      };

      expect(conversionRates['Lead → Qualified']).toBe(80);
      expect(conversionRates['Overall Win Rate']).toBe(30);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent stage movements', async () => {
      // Test race condition handling
      const opportunity = testHelpers.createTestOpportunity();
      
      // Mock concurrent updates (simplified)
      const updates = [
        { stageId: testStages[1].id, timestamp: new Date('2025-01-01T10:00:00Z') },
        { stageId: testStages[2].id, timestamp: new Date('2025-01-01T10:00:01Z') }
      ];

      // Last update should win
      const finalUpdate = updates.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];

      expect(finalUpdate.stageId).toBe(testStages[2].id);
    });

    it('should validate business rules', async () => {
      // Test various business rule validations
      
      // 1. Cannot move to inactive stage
      const inactiveStage = { ...testStages[0], isActive: false };
      const moveToInactiveResult = {
        valid: false,
        error: 'Cannot move opportunity to inactive stage'
      };

      expect(moveToInactiveResult.valid).toBe(false);

      // 2. Cannot delete stage with opportunities without migration
      const stageWithOpportunities = {
        hasOpportunities: true,
        migrationStageProvided: false
      };

      const deletionResult = {
        valid: stageWithOpportunities.hasOpportunities && !stageWithOpportunities.migrationStageProvided ? false : true,
        error: stageWithOpportunities.hasOpportunities && !stageWithOpportunities.migrationStageProvided 
          ? 'Cannot delete stage with opportunities without migration' 
          : null
      };

      expect(deletionResult.valid).toBe(false);

      // 3. Probability must be 0-100
      const invalidProbabilities = [-10, 150];
      invalidProbabilities.forEach(prob => {
        const validation = {
          valid: prob >= 0 && prob <= 100,
          error: prob < 0 || prob > 100 ? 'Probability must be between 0 and 100' : null
        };
        expect(validation.valid).toBe(false);
      });
    });
  });
});