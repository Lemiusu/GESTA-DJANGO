from django.shortcuts import render
from django.http import HttpResponse

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import DashboardCoordinadorSerializer


class DashboardCoordinadorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = DashboardCoordinadorSerializer({})
        return Response(serializer.data)

def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")

