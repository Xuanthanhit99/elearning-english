import { Injectable } from '@nestjs/common';
import { SearchResultType } from './dto/search-query.dto';

@Injectable()
export class SearchRouteRegistry {
  href(type: SearchResultType, input: { id: string; slug?: string | null }) {
    const slugOrId = encodeURIComponent(input.slug || input.id);

    switch (type) {
      case SearchResultType.VOCABULARY_WORD:
        return `/vocabulary?word=${slugOrId}`;
      case SearchResultType.VOCABULARY_TOPIC:
        return `/vocabulary?topic=${slugOrId}`;
      case SearchResultType.GRAMMAR_TOPIC:
        return `/grammar/topic/${slugOrId}`;
      case SearchResultType.GRAMMAR_LESSON:
        return `/grammar/lesson/${slugOrId}`;
      case SearchResultType.READING_ARTICLE:
        return `/reading/articles/${slugOrId}`;
      case SearchResultType.READING_CATEGORY:
        return `/reading/categories/${slugOrId}`;
      case SearchResultType.LISTENING_CONTENT:
        return `/listening`;
      case SearchResultType.LISTENING_TOPIC:
        return `/listening/topics?topic=${slugOrId}`;
      case SearchResultType.SPEAKING_TOPIC:
        return `/speaking/topics/${slugOrId}`;
      case SearchResultType.SPEAKING_LESSON:
        return `/speaking/topics`;
      case SearchResultType.WRITING_TOPIC:
        return `/writing/topics/${slugOrId}`;
      case SearchResultType.WRITING_LESSON:
        return `/writing/topics/${slugOrId}`;
      case SearchResultType.COURSE:
        return `/courses/${slugOrId}`;
      case SearchResultType.COMMUNITY_POST:
        return `/community?post=${slugOrId}`;
      case SearchResultType.COMMUNITY_CLUB:
        return `/community/clubs/${slugOrId}`;
      default:
        return '/dashboard';
    }
  }
}
