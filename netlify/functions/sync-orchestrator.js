// Main Sync Orchestrator Netlify Function - Replaces all the old broken sync functions

// Import the ES modules using dynamic import since Netlify functions use CommonJS
let syncOrchestrator;

async function getSyncOrchestrator() {
  if (!syncOrchestrator) {
    const module = await import('../../src/lib/sync-orchestrator.ts');
    syncOrchestrator = module.syncOrchestrator;
  }
  return syncOrchestrator;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log(`[sync-orchestrator] ${event.httpMethod} ${event.path}`);
  console.log(`[sync-orchestrator] Query params:`, event.queryStringParameters);

  try {
    // Route based on HTTP method and action
    const action = event.queryStringParameters?.action || 'sync';
    const userId = event.queryStringParameters?.userId;
    const syncId = event.queryStringParameters?.syncId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing userId parameter',
          message: 'userId is required as a query parameter'
        })
      };
    }

    switch (event.httpMethod) {
      case 'POST':
        return await handleSyncRequest(event, headers, userId, action);
      
      case 'GET':
        return await handleStatusRequest(headers, userId, syncId, action);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('[sync-orchestrator] Unhandled error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

// Handle POST requests (start sync, cancel sync, etc.)
async function handleSyncRequest(event, headers, userId, action) {
  let requestBody = {};
  
  if (event.body) {
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          message: 'Request body must be valid JSON'
        })
      };
    }
  }

  switch (action) {
    case 'sync':
      return await startSync(headers, userId, requestBody);
    
    case 'cancel':
      return await cancelSync(headers, userId, requestBody.syncId);
    
    case 'resume':
      return await resumeSync(headers, userId, requestBody.syncId);
    
    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid action',
          message: `Action '${action}' is not supported. Use: sync, cancel, resume`
        })
      };
  }
}

// Handle GET requests (status, history, etc.)
async function handleStatusRequest(headers, userId, syncId, action) {
  switch (action) {
    case 'status':
      if (!syncId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing syncId parameter',
            message: 'syncId is required for status requests'
          })
        };
      }
      return await getSyncStatus(headers, userId, syncId);
    
    case 'history':
      return await getSyncHistory(headers, userId);
    
    case 'cleanup':
      return await cleanupOldSessions(headers, userId);
    
    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid action',
          message: `Action '${action}' is not supported for GET requests. Use: status, history, cleanup`
        })
      };
  }
}

// Start a new sync
async function startSync(headers, userId, requestBody) {
  console.log(`[sync-orchestrator] Starting sync for user ${userId}`);
  console.log(`[sync-orchestrator] Request body:`, requestBody);

  try {
    const orchestrator = await getSyncOrchestrator();
    
    const syncRequest = {
      userId,
      timeRange: requestBody.timeRange,
      options: requestBody.options || {}
    };

    const response = await orchestrator.orchestrateSync(syncRequest);

    console.log(`[sync-orchestrator] Sync completed for user ${userId}:`, response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        syncId: response.syncId,
        status: response.status,
        progress: response.progress,
        results: response.results,
        error: response.error
      })
    };

  } catch (error) {
    console.error(`[sync-orchestrator] Sync failed for user ${userId}:`, error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Sync failed',
        message: error.message,
        details: {
          type: error.constructor.name,
          code: error.code,
          phase: error.phase
        }
      })
    };
  }
}

// Get sync status
async function getSyncStatus(headers, userId, syncId) {
  console.log(`[sync-orchestrator] Getting status for sync ${syncId}, user ${userId}`);

  try {
    const orchestrator = await getSyncOrchestrator();
    const response = await orchestrator.getSyncStatus(syncId, userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        syncId: response.syncId,
        status: response.status,
        progress: response.progress,
        error: response.error
      })
    };

  } catch (error) {
    console.error(`[sync-orchestrator] Failed to get status for sync ${syncId}:`, error);

    if (error.message.includes('not found')) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Sync session not found',
          message: `Sync session ${syncId} not found for user ${userId}`
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to get sync status',
        message: error.message
      })
    };
  }
}

// Cancel a running sync
async function cancelSync(headers, userId, syncId) {
  console.log(`[sync-orchestrator] Cancelling sync ${syncId} for user ${userId}`);

  if (!syncId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Missing syncId',
        message: 'syncId is required to cancel a sync'
      })
    };
  }

  try {
    const orchestrator = await getSyncOrchestrator();
    await orchestrator.cancelSync(syncId, userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Sync ${syncId} cancelled successfully`
      })
    };

  } catch (error) {
    console.error(`[sync-orchestrator] Failed to cancel sync ${syncId}:`, error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to cancel sync',
        message: error.message
      })
    };
  }
}

// Resume a failed sync
async function resumeSync(headers, userId, syncId) {
  console.log(`[sync-orchestrator] Resuming sync ${syncId} for user ${userId}`);

  if (!syncId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Missing syncId',
        message: 'syncId is required to resume a sync'
      })
    };
  }

  try {
    const orchestrator = await getSyncOrchestrator();
    const response = await orchestrator.resumeSync(syncId, userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        syncId: response.syncId,
        status: response.status,
        progress: response.progress,
        results: response.results,
        error: response.error
      })
    };

  } catch (error) {
    console.error(`[sync-orchestrator] Failed to resume sync ${syncId}:`, error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to resume sync',
        message: error.message
      })
    };
  }
}

// Get sync history
async function getSyncHistory(headers, userId) {
  console.log(`[sync-orchestrator] Getting sync history for user ${userId}`);

  try {
    const orchestrator = await getSyncOrchestrator();
    const history = await orchestrator.getSyncHistory(userId, 10);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        history: history,
        count: history.length
      })
    };

  } catch (error) {
    console.error(`[sync-orchestrator] Failed to get sync history for user ${userId}:`, error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to get sync history',
        message: error.message
      })
    };
  }
}

// Clean up old sync sessions
async function cleanupOldSessions(headers, userId) {
  console.log(`[sync-orchestrator] Cleaning up old sessions for user ${userId}`);

  try {
    const orchestrator = await getSyncOrchestrator();
    const deletedCount = await orchestrator.cleanupOldSessions(userId, 7);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Cleaned up ${deletedCount} old sync sessions`,
        deletedCount: deletedCount
      })
    };

  } catch (error) {
    console.error(`[sync-orchestrator] Failed to cleanup sessions for user ${userId}:`, error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to cleanup old sessions',
        message: error.message
      })
    };
  }
}