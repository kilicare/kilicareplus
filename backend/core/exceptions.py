from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        error_data = {
            'success': False,
            'status_code': response.status_code,
            'errors': response.data,
        }
        if isinstance(response.data, dict):
            first = next(iter(response.data), None)
            if first == 'detail':
                error_data['message'] = str(response.data['detail'])
            elif first and isinstance(response.data[first], list):
                error_data['message'] = str(response.data[first][0])
            else:
                error_data['message'] = 'Hitilafu imetokea. Jaribu tena.'
        else:
            error_data['message'] = str(response.data)
        response.data = error_data
    return response