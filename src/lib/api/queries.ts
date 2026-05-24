export const FIND_SHOWS = `
query FindShowsForEhV2($term: String, $filter: EhShowSearchFilterInput!, $order: EhShowSearchOrder!, $page: Int) {
  foundShows: findShowsForEhV2(term: $term, filter: $filter, order: $order, page: $page) {
    shows {
      id
      name
      nationIoc
      firstDay
      lastDay
      disciplines
      __typename
    }
    totalPages
    totalElements
    __typename
  }
}`;

export const GET_SHOW_MASTERLIST = `
query GetShowMasterlist($showId: ID!) {
  masterlist: showMasterlist(showId: $showId) {
    showId
    name
    nationIoc
    firstDay
    lastDay
    competitions {
      id
      name
      number
      discipline
      status
      numberOfCompetitors
      numberOfFinishedCompetitors
      publishingStatus
      instant
      __typename
    }
    __typename
  }
}`;

export const LOAD_JUMPING_COMPETITION = `
query LoadPublicJumpingCompetition($competitionId: ID!) {
  competition: publicJumpingIndividualCompetition(id: $competitionId) {
    __typename
    id
    name
    number
    status
    discipline
    publishingStatus
    zonedInstant { instant __typename }
    show { id name firstDay lastDay __typename }
    competitors {
      __typename
      id
      status
      rankOfficial
      horsConcours
      placed
      ... on JumpingCompetitor {
        ... on JumpingIndividualCompetitor {
          athlete {
            __typename
            apiId
            person {
              __typename
              apiId
              name
              firstName
              familyName
              nation { id ioc __typename }
            }
          }
          horse {
            __typename
            apiId
            name
            permanentBridleNumber
          }
          __typename
        }
        __typename
      }
    }
  }
}`;

export const LOAD_DRESSAGE_COMPETITION = `
query LoadPublicDressageCompetition($competitionId: ID!) {
  competition: publicDressageCompetition(id: $competitionId) {
    __typename
    id
    name
    number
    status
    discipline
    publishingStatus
    zonedInstant { instant __typename }
    show { id name firstDay lastDay __typename }
    competitors {
      __typename
      id
      placed
      status
      horsConcours
      rankOfficial
      ... on DressageCompetitor {
        resultOfficial
        resultOfficialPoints
        ... on DressageIndividualCompetitor {
          athlete {
            __typename
            apiId
            person {
              __typename
              apiId
              name
              firstName
              familyName
              nation { id ioc __typename }
            }
          }
          horse {
            __typename
            apiId
            name
            permanentBridleNumber
          }
          __typename
        }
        __typename
      }
    }
  }
}`;

export const LOAD_EVENTING_COMPETITION = `
query LoadPublicEventingCompetition($competitionId: ID!) {
  competition: publicEventingIndividualCompetition(id: $competitionId) {
    __typename
    id
    name
    number
    status
    discipline
    publishingStatus
    zonedInstant { instant __typename }
    show { id name firstDay lastDay __typename }
    competitors {
      __typename
      id
      placed
      status
      horsConcours
      rankOfficial
      ... on EventingCompetitor {
        resultOfficial
        ... on EventingIndividualCompetitor {
          athlete {
            __typename
            apiId
            person {
              __typename
              apiId
              name
              firstName
              familyName
              nation { id ioc __typename }
            }
          }
          horse {
            __typename
            apiId
            name
            permanentBridleNumber
          }
          __typename
        }
        __typename
      }
    }
  }
}`;
