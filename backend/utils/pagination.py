from math import ceil


def paginate_query(query, model_to_dict_fn, page=1, per_page=20, max_per_page=100):
    """
    Generic pagination helper for SQLAlchemy queries.
    
    Args:
        query: SQLAlchemy query object
        model_to_dict_fn: Function to convert model instances to dict
        page: Page number (1-indexed)
        per_page: Items per page
        max_per_page: Maximum allowed items per page
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    # Validate and clamp pagination params
    page = max(1, page)
    per_page = min(max(per_page, 1), max_per_page)
    
    # Get total count
    total = query.count()
    total_pages = ceil(total / per_page) if total > 0 else 0
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Execute paginated query
    items = query.offset(offset).limit(per_page).all()
    
    return {
        'data': [model_to_dict_fn(item) for item in items],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages
    }, 200
