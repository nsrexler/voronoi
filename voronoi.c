//#include <stdlib.h>

typedef struct POINT {
    int x;
    int y;
} point;
point *points;
static int pointCount = 0;

void initPoints(int numPoints) {
    pointCount = numPoints;
    //points = malloc(numPoints * sizeof(point));
}

// void freePoints() {
//     free(points);
// }

void setPoint(int idx, int x, int y) {
    points[idx].x = x;
    points[idx].y = y;
}

static int sqDistanceTo(int ax, int ay, int bx, int by) {
    int c = ax - bx;
    int d = ay - by;
    return c*c + d*d;
}

int findClosestPoint(int x, int y) {
    int closestPoint = -1;
    int closestDistance = -1;
    for(int i = 0; i < pointCount; i++) {
        point cur = points[i];
        int dist = sqDistanceTo(cur.x, cur.y, x, y);
        if(closestPoint == -1 || closestDistance > dist) {
            closestPoint = i;
            closestDistance = dist;
        }
    }
    return closestPoint;
}

//int main(){return 0;}