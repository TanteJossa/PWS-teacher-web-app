import json

with open('src/saved_section_data.json', 'r') as f:
    data = json.load(f)
    
def getSection(section):
    return {
        "id" : section["id"],
        "answer" : section["answer"],
        "student_id" : section["student_id"],
        "question_number" : section["question_number"],
    }
    
new_data = []
for student in data:
    new_data.append({
        "student_id": student["student_id"],
        "sections": [getSection(x) for x in student["sections"]]
    })
    
with open('saved_section_data2.json', 'w') as f:
    json.dump(new_data, f, indent=4)