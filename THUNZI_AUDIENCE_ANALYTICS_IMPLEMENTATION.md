# ThunziAI Audience Analytics Implementation Plan

## Overview
Integrate ThunziAI audience demographics data into BantuBuzz analytics for:
1. Brand Campaign Analytics
2. Brand Overall Analytics
3. Creator Profile View Analytics

---

## Thunzi Audience API

### Endpoint
```
GET /api/platforms/:platformId/audience
```

### Example Response (Platform ID 227)
```json
{
  "id": 1,
  "platormConnectionId": 227,
  "ageGender": [
    [{"breakdown": "18-24", "value": 28}],
    [{"breakdown": "25-34", "value": 48}],
    [{"breakdown": "35-44", "value": 18}],
    [{"breakdown": "45-54", "value": 7}],
    [{"breakdown": "65+", "value": 3}]
  ],
  "countries": [
    [{"breakdown": "MU", "value": 1}],
    [{"breakdown": "RW", "value": 1}],
    [{"breakdown": "ZW", "value": 98}],
    [{"breakdown": "DZ", "value": 3}],
    [{"breakdown": "ZA", "value": 1}]
  ],
  "cities": [
    [{"breakdown": "Kadoma, Mashonaland West Province", "value": 3}],
    [{"breakdown": "Gweru, Midlands Province", "value": 1}],
    [{"breakdown": "Bulawayo, Bulawayo", "value": 22}],
    [{"breakdown": "Harare, Harare Province", "value": 59}],
    ...
  ],
  "gender": [
    [{"breakdown": "F", "value": 39}],
    [{"breakdown": "M", "value": 49}],
    [{"breakdown": "U", "value": 16}]
  ],
  "createdAt": "2026-03-25T21:01:40.223Z",
  "updatedAt": "2026-03-25T21:01:40.223Z"
}
```

### Response Fields
- `id`: Audience data ID
- `platormConnectionId`: ThunziAI platform connection ID (note: typo in Thunzi API - "platorm")
- `ageGender`: Array of arrays containing age breakdown (note: misnamed, only contains age data)
- `countries`: Array of arrays containing country breakdown (ISO country codes)
- `cities`: Array of arrays containing city breakdown
- `gender`: Array of arrays containing gender breakdown (F, M, U)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Data Structure Notes
- Each demographic field is an **array of arrays** where each inner array contains a single object
- `breakdown`: The category label (e.g., "18-24", "ZW", "F")
- `value`: The percentage or count in that category
- Country codes use ISO 2-letter format (ZW, ZA, MU, etc.)
- Gender: F (Female), M (Male), U (Unknown/Undisclosed)

---

## Implementation Plan

### Phase 1: Backend - Add Audience Data Fetching

#### 1.1 Update ThunziAI Service
**File:** `backend/app/services/thunzi_service.py`

Add new method to fetch audience data:

```python
def get_platform_audience(self, platform_id: int) -> Optional[Dict]:
    """
    Get audience demographics for a platform

    Args:
        platform_id: ThunziAI platform connection ID

    Returns:
        {
            "id": number,
            "platormConnectionId": number,  # Note: typo in Thunzi API
            "ageGender": [[{"breakdown": string, "value": number}]],  # Age data
            "countries": [[{"breakdown": string, "value": number}]],  # ISO codes
            "cities": [[{"breakdown": string, "value": number}]],
            "gender": [[{"breakdown": string, "value": number}]],  # F, M, U
            "createdAt": string,
            "updatedAt": string
        }
    """
    self._ensure_authenticated()

    try:
        url = f"{self.BASE_URL}/api/platforms/{platform_id}/audience"

        log_external_api_call(
            service='ThunziAI',
            method='GET',
            url=url,
            payload={'platform_id': platform_id}
        )

        response = self.session.get(url)

        log_external_api_response(
            service='ThunziAI',
            method='GET',
            url=url,
            status_code=response.status_code,
            response_body=response.json() if response.status_code == 200 else response.text[:500]
        )

        if response.status_code == 200:
            data = response.json()
            # Flatten nested arrays for easier consumption
            return {
                'id': data.get('id'),
                'platformId': data.get('platormConnectionId'),  # Fix typo
                'age': self._flatten_audience_data(data.get('ageGender', [])),
                'countries': self._flatten_audience_data(data.get('countries', [])),
                'cities': self._flatten_audience_data(data.get('cities', [])),
                'gender': self._flatten_audience_data(data.get('gender', [])),
                'createdAt': data.get('createdAt'),
                'updatedAt': data.get('updatedAt')
            }

        log_error('ThunziAI.get_platform_audience',
                 f"Failed with status {response.status_code}: {response.text[:200]}")
        return None
    except Exception as e:
        log_error('ThunziAI.get_platform_audience', e)
        return None

def _flatten_audience_data(self, nested_data: List) -> List[Dict]:
    """
    Flatten nested audience data arrays

    Input: [[{"breakdown": "18-24", "value": 28}], [{"breakdown": "25-34", "value": 48}]]
    Output: [{"breakdown": "18-24", "value": 28}, {"breakdown": "25-34", "value": 48}]
    """
    flattened = []
    for item_array in nested_data:
        if item_array and len(item_array) > 0:
            flattened.append(item_array[0])
    return flattened
```

---

#### 1.2 Create Analytics Helper Functions
**File:** `backend/app/services/thunzi_service.py` (add to class)

```python
def get_aggregated_audience(self, platform_ids: List[int]) -> Dict:
    """
    Get aggregated audience data across multiple platforms

    Useful for brand analytics to see combined audience from all campaigns

    Args:
        platform_ids: List of ThunziAI platform IDs

    Returns:
        Aggregated audience data with totals and percentages
    """
    all_audiences = []

    for platform_id in platform_ids:
        audience = self.get_platform_audience(platform_id)
        if audience:
            all_audiences.append(audience)

    if not all_audiences:
        return None

    # Aggregate data
    aggregated = {
        'age': self._aggregate_demographic(all_audiences, 'age'),
        'countries': self._aggregate_demographic(all_audiences, 'countries'),
        'cities': self._aggregate_demographic(all_audiences, 'cities'),
        'gender': self._aggregate_demographic(all_audiences, 'gender'),
        'totalPlatforms': len(all_audiences)
    }

    return aggregated

def _aggregate_demographic(self, audiences: List[Dict], field: str) -> List[Dict]:
    """
    Aggregate a demographic field across multiple audiences

    Sums up values for same breakdowns and calculates percentages
    """
    breakdown_totals = {}

    for audience in audiences:
        demographics = audience.get(field, [])
        for demo in demographics:
            breakdown = demo.get('breakdown')
            value = demo.get('value', 0)

            if breakdown:
                if breakdown not in breakdown_totals:
                    breakdown_totals[breakdown] = 0
                breakdown_totals[breakdown] += value

    # Convert to list and calculate percentages
    total = sum(breakdown_totals.values())
    result = []

    for breakdown, value in breakdown_totals.items():
        percentage = (value / total * 100) if total > 0 else 0
        result.append({
            'breakdown': breakdown,
            'value': value,
            'percentage': round(percentage, 2)
        })

    # Sort by value descending
    result.sort(key=lambda x: x['value'], reverse=True)

    return result
```

---

### Phase 2: Backend - Create API Endpoints

#### 2.1 Creator Audience Endpoint
**File:** `backend/app/routes/creators.py`

```python
@bp.route('/<int:creator_id>/audience', methods=['GET'])
@jwt_required()
def get_creator_audience(creator_id):
    """
    Get aggregated audience demographics for a creator across all platforms

    Combines audience data from all connected ThunziAI platforms
    """
    try:
        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        # Get ThunziAI account
        thunzi_account = ThunziAccount.query.filter_by(
            bantubuzz_user_id=creator.user_id,
            bantubuzz_user_type='creator'
        ).first()

        if not thunzi_account or not thunzi_account.thunzi_creator_id:
            return jsonify({'error': 'Creator not connected to ThunziAI'}), 404

        # Get all platforms for this creator
        thunzi_service.login()
        platforms = thunzi_service.get_creator_platforms(thunzi_account.thunzi_creator_id)

        if not platforms:
            return jsonify({'error': 'No platforms found'}), 404

        # Get platform IDs
        platform_ids = [p['id'] for p in platforms if p.get('isConnected')]

        if not platform_ids:
            return jsonify({'error': 'No connected platforms'}), 404

        # Get aggregated audience data
        audience_data = thunzi_service.get_aggregated_audience(platform_ids)

        if not audience_data:
            return jsonify({'error': 'No audience data available'}), 404

        return jsonify(audience_data), 200

    except Exception as e:
        print(f"Error getting creator audience: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

#### 2.2 Campaign Audience Endpoint
**File:** `backend/app/routes/campaigns.py`

```python
@bp.route('/<int:campaign_id>/audience', methods=['GET'])
@jwt_required()
def get_campaign_audience(campaign_id):
    """
    Get aggregated audience demographics for creators in a campaign

    Combines audience data from all creators who have collaborations in this campaign
    """
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found or unauthorized'}), 404

        # Get all collaborations for this campaign
        collaborations = Collaboration.query.filter_by(campaign_id=campaign_id).all()

        if not collaborations:
            return jsonify({'error': 'No collaborations found for this campaign'}), 404

        # Get ThunziAI platform IDs for all creators in collaborations
        platform_ids = []

        for collab in collaborations:
            thunzi_account = ThunziAccount.query.filter_by(
                bantubuzz_user_id=collab.creator.user_id,
                bantubuzz_user_type='creator'
            ).first()

            if thunzi_account and thunzi_account.thunzi_creator_id:
                thunzi_service.login()
                platforms = thunzi_service.get_creator_platforms(thunzi_account.thunzi_creator_id)
                platform_ids.extend([p['id'] for p in platforms if p.get('isConnected')])

        if not platform_ids:
            return jsonify({'error': 'No platform data available'}), 404

        # Get aggregated audience data
        audience_data = thunzi_service.get_aggregated_audience(platform_ids)

        if not audience_data:
            return jsonify({'error': 'No audience data available'}), 404

        return jsonify(audience_data), 200

    except Exception as e:
        print(f"Error getting campaign audience: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

#### 2.3 Brand Overall Audience Endpoint
**File:** `backend/app/routes/brands.py` (or create new analytics route)

```python
@bp.route('/<int:brand_id>/audience', methods=['GET'])
@jwt_required()
def get_brand_audience(brand_id):
    """
    Get aggregated audience demographics across ALL brand campaigns

    Shows combined reach across all campaigns and collaborations
    """
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.get(brand_id)

        if not brand or brand.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Get all campaigns for this brand
        campaigns = Campaign.query.filter_by(brand_id=brand_id).all()

        # Get all collaborations across all campaigns
        platform_ids = []

        for campaign in campaigns:
            collaborations = Collaboration.query.filter_by(campaign_id=campaign.id).all()

            for collab in collaborations:
                thunzi_account = ThunziAccount.query.filter_by(
                    bantubuzz_user_id=collab.creator.user_id,
                    bantubuzz_user_type='creator'
                ).first()

                if thunzi_account and thunzi_account.thunzi_creator_id:
                    thunzi_service.login()
                    platforms = thunzi_service.get_creator_platforms(thunzi_account.thunzi_creator_id)
                    platform_ids.extend([p['id'] for p in platforms if p.get('isConnected')])

        if not platform_ids:
            return jsonify({'error': 'No audience data available'}), 404

        # Get aggregated audience data
        audience_data = thunzi_service.get_aggregated_audience(platform_ids)

        if not audience_data:
            return jsonify({'error': 'No audience data available'}), 404

        return jsonify({
            **audience_data,
            'totalCampaigns': len(campaigns),
            'totalCollaborations': sum(len(Collaboration.query.filter_by(campaign_id=c.id).all()) for c in campaigns)
        }), 200

    except Exception as e:
        print(f"Error getting brand audience: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

---

### Phase 3: Frontend - Audience Analytics Components

#### 3.1 Create Reusable Audience Charts Component
**File:** `frontend/src/components/AudienceCharts.jsx`

```jsx
import { Pie, Bar } from 'react-chartjs-2';

const AudienceCharts = ({ audienceData }) => {
  if (!audienceData) return null;

  // Prepare Age Chart Data
  const ageChartData = {
    labels: audienceData.age?.map(d => d.breakdown) || [],
    datasets: [{
      label: 'Age Distribution',
      data: audienceData.age?.map(d => d.percentage) || [],
      backgroundColor: ['#ccdb53', '#838a36', '#ebf4e5', '#f59e0b', '#ef4444']
    }]
  };

  // Prepare Gender Chart Data
  const genderChartData = {
    labels: audienceData.gender?.map(d =>
      d.breakdown === 'F' ? 'Female' :
      d.breakdown === 'M' ? 'Male' : 'Unknown'
    ) || [],
    datasets: [{
      label: 'Gender Distribution',
      data: audienceData.gender?.map(d => d.percentage) || [],
      backgroundColor: ['#ccdb53', '#838a36', '#ebf4e5']
    }]
  };

  // Top 5 Countries
  const topCountries = audienceData.countries?.slice(0, 5) || [];
  const countryChartData = {
    labels: topCountries.map(d => d.breakdown),
    datasets: [{
      label: 'Top Countries (%)',
      data: topCountries.map(d => d.percentage),
      backgroundColor: '#ccdb53'
    }]
  };

  // Top 10 Cities
  const topCities = audienceData.cities?.slice(0, 10) || [];
  const cityChartData = {
    labels: topCities.map(d => d.breakdown.split(',')[0]), // City name only
    datasets: [{
      label: 'Top Cities (%)',
      data: topCities.map(d => d.percentage),
      backgroundColor: '#838a36'
    }]
  };

  return (
    <div className="space-y-6">
      {/* Age & Gender Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Age Distribution</h3>
          <Pie data={ageChartData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Gender Distribution</h3>
          <Pie data={genderChartData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>

      {/* Countries */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Countries</h3>
        <Bar data={countryChartData} options={{ indexAxis: 'y', responsive: true }} />
      </div>

      {/* Cities */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Cities</h3>
        <Bar data={cityChartData} options={{ indexAxis: 'y', responsive: true }} />
      </div>
    </div>
  );
};

export default AudienceCharts;
```

#### 3.2 Add API Methods
**File:** `frontend/src/services/api.js`

```javascript
export const analyticsAPI = {
  // Creator audience
  getCreatorAudience: (creatorId) =>
    api.get(`/creators/${creatorId}/audience`),

  // Campaign audience
  getCampaignAudience: (campaignId) =>
    api.get(`/campaigns/${campaignId}/audience`),

  // Brand overall audience
  getBrandAudience: (brandId) =>
    api.get(`/brands/${brandId}/audience`)
};
```

---

### Phase 4: Integration Points

#### 4.1 Brand Campaign Analytics Page
**File:** `frontend/src/pages/CampaignDetails.jsx` or dedicated analytics page

Add audience section:

```jsx
const [audienceData, setAudienceData] = useState(null);

useEffect(() => {
  fetchAudienceData();
}, [campaignId]);

const fetchAudienceData = async () => {
  try {
    const response = await analyticsAPI.getCampaignAudience(campaignId);
    setAudienceData(response.data);
  } catch (error) {
    console.error('Error fetching audience data:', error);
  }
};

// In render:
<div className="mt-6">
  <h2 className="text-2xl font-bold mb-4">Audience Demographics</h2>
  <AudienceCharts audienceData={audienceData} />
</div>
```

#### 4.2 Brand Overall Analytics
**Location:** Brand dashboard or analytics page

```jsx
<AudienceCharts audienceData={brandAudienceData} />
```

#### 4.3 Creator Profile View (Public)
**File:** `frontend/src/pages/CreatorProfile.jsx` (when viewing creator)

```jsx
<div className="mb-6">
  <h3 className="text-xl font-bold mb-4">Audience Insights</h3>
  <AudienceCharts audienceData={creatorAudienceData} />
</div>
```

---

## Testing Plan

### 1. Direct API Test
```bash
# Test with platformId 227
curl https://app.thunzi.co/api/platforms/227/audience
```

### 2. Backend Service Test
```python
from app.services.thunzi_service import thunzi_service

# Login
thunzi_service.login()

# Get audience for platform 227
audience = thunzi_service.get_platform_audience(227)
print(audience)

# Test aggregation
audiences = thunzi_service.get_aggregated_audience([227, 228, 229])
print(audiences)
```

### 3. API Endpoint Tests
```bash
# Creator audience
curl -H "Authorization: Bearer $TOKEN" \
  https://bantubuzz.com/api/creators/123/audience

# Campaign audience
curl -H "Authorization: Bearer $TOKEN" \
  https://bantubuzz.com/api/campaigns/456/audience

# Brand overall audience
curl -H "Authorization: Bearer $TOKEN" \
  https://bantubuzz.com/api/brands/789/audience
```

---

## Data Visualization Examples

### Age Distribution
- 18-24: 28%
- 25-34: 48% (largest segment)
- 35-44: 18%
- 45-54: 7%
- 65+: 3%

### Gender Distribution
- Male: 49%
- Female: 39%
- Unknown: 16%

### Top Countries
- Zimbabwe: 98%
- Algeria: 3%
- Others: <1% each

### Top Cities
- Harare: 59%
- Bulawayo: 22%
- Kadoma: 3%
- Others: distributed

---

## Key Considerations

1. **API Authentication**: Ensure ThunziAI session is authenticated before calling audience endpoint
2. **Data Caching**: Consider caching audience data (updates infrequently)
3. **Error Handling**: Handle cases where platforms have no audience data
4. **Aggregation Logic**: When combining multiple platforms, sum values correctly
5. **Country Code Mapping**: May need to map ISO codes to full country names for display
6. **Nested Arrays**: Flatten the nested array structure for easier consumption
7. **Permissions**: Ensure only authorized users can view audience data

---

## Next Steps

1. ✅ Test endpoint and document response structure
2. ⏳ Implement backend service methods
3. ⏳ Create API endpoints
4. ⏳ Build frontend components
5. ⏳ Integrate into analytics pages
6. ⏳ Update ThunziAI documentation

---

**Implementation Date:** March 26, 2026
**Status:** Planning Complete - Ready for Implementation
