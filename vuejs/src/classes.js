// Importing required libraries (not needed in the same way as Python)
import { v4 as uuidv4 } from 'uuid' 
import { sum, erf, average, standardDeviation } from '@/helpers'
import jsStat from 'jstat'

const data_classes = {}


// Correlation function
function correlation(list1, list2) {
    const n = list1.length;
    if (list1.length !== list2.length || n <= 1) return null;

    const list1Mean = list1.reduce((sum, val) => sum + val, 0) / n;
    const list2Mean = list2.reduce((sum, val) => sum + val, 0) / n;

    const cov = list1.reduce((sum, val, i) => sum + (val - list1Mean) * (list2[i] - list2Mean), 0) / (n - 1);
    
    const list1Stdev = standardDeviation(list1);
    const list2Stdev = standardDeviation(list2);
    
    return cov / (list1Stdev * list2Stdev);
}
data_classes.correlation = correlation

class NormalDistribution {
    constructor({
        mean=10,
        standard_deviation=3,
        values=null
    }){
        if (values){
            mean = average(values)
            standard_deviation = standardDeviation(values)
        }

        this.mean = mean
        this.standard_deviation =standard_deviation
    }
    steekproef(n){
        return NormalDistribution({mean: this.mean, standard_deviation: this.standard_deviation/ Math.sqrt(n)})
    }
    is_risk(alfa, steekproef_n, steekproef_resultaat){
        const steekproeven = this.steekproef(steekproef_n)
    
        const voorschrift = steekproeven.invNorm(alfa/2)
    
        const h0 = steekproeven.mean
        const h1 = steekproef_resultaat < voorschrift[0] && steekproef_resultaat > voorschrift[1]
    
        return !h1
    }
    pdf(x){
        return (1 / (this.standard_deviation * Math.sqrt(2*Math.PI)) * Math.pow(Math.E, -0.5*Math.pow((x-this.mean) / this.standard_deviation, 2)))
    }
    erf(x){

    }
    cdf(x){
        return 0.5*(1+erf((x-this.mean) / (this.standard_deviation*Math.SQRT2)))
    }
    invNorm(opp, dir='LEFT'){
        if (dir=='LEFT'){
            const inv = jsStat.normal.inv(opp, this.mean, this.standard_deviation)

            return inv
        } 
        if (dir=='RIGHT'){
            const inv = jsStat.normal.inv(opp, this.mean, this.standard_deviation)

            return this.mean + (this.mean - inv)
        }
        if (dir == 'CENTER'){
            const inv = jsStat.normal.inv((1-opp)/2, this.mean, this.standard_deviation)

            // const diff = this.mean - inv
            return [inv, this.mean - (inv - this.mean)]
        }
        return NaN
    }
}
data_classes.NormalDistribution = NormalDistribution

class BaseClass {
    constructor(){}
    // set without changing reference
    set(val){
        Object.keys(this).forEach(key => {
            if (Object.keys(val).includes(key)){
                this[key] = val[key]
            }
        })
    }
}



// GradeFormula class
class GradeFormula extends BaseClass {
    constructor(id = uuidv4(), name = "Method name", method = (percent) => (9 * percent + 1)) {
        super()
        this.id = id;
        this.name = name;
        this.method = method;
    }
}
data_classes.GradeFormula = GradeFormula

// Question class
class Question extends BaseClass {
    constructor({total_points, question_number, id = uuidv4(), sections = []}) {
        super()
        this.id = id;
        this.question_number = question_number;
        this.original_points = total_points;
        this.sections = sections;
        this.total_points = total_points; // changed by user
    }
}
data_classes.Question = Question

class Student extends BaseClass {
    constructor({id = uuidv4(), name=""}){
        super()
        this.id = id
        this.name = name
    }
}
data_classes.Student = Student

// Result class
class Result extends BaseClass {
    constructor({question = new Question(), student = {}, points = 1, id = uuidv4()}) {
        super()
        this.id = id;
        this.question = question;
        this.student = student;
        this._points = points; // private variable
    }

    get total_points() {
        return this.question.total_points;
    }

    get question_number() {
        return this.question.question_number;
    }

    get points() {
        return this._points;
    }

    set points(value) {
        this._points = value; // Ensure points are set
    }

    get percent() {
        return this.points / this.total_points;
    }
}
data_classes.Result = Result

// ResultBundle class
class ResultBundle extends BaseClass {
    constructor({
        results = [], 
        id = uuidv4(), 
        test = {}
    }) {
        super()
        this.id = id;
        this.test = test;
        this.results = results;
    }

    [Symbol.iterator]() {
        return this.results[Symbol.iterator]();
    }

    get grade() {
        return this.test.grade_formula.method(this.points / this.total_points);
    }

    get points() {
        return this.results.reduce((sum, result) => sum + result.points, 0);
    }

    get total_points() {
        return this.results.reduce((sum, result) => sum + result.total_points, 0);
    }
    get average_points(){
        return this.points / this.results.length
    }

    get average_percent(){
        return this.results.reduce((sum, result) => sum + result.percent, 0) / this.results.length;
    }
    get average(){
        if (this.test.data_type == 'points'){
            return this.average_points
        } 
        if (this.test.data_type == 'percent'){
            return this.average_percent * 100
        } 
    }


    get standard_deviation_points(){
        return standardDeviation(this.results.map(result => result.points));
    }

    get standard_deviation_percent(){
        return standardDeviation(this.results.map(result => result.percent));
    }
    get standard_deviation(){
        if (this.test.data_type == 'points'){
            return this.standard_deviation_points
        } 
        if (this.test.data_type == 'percent'){
            return this.standard_deviation_percent * 100
        } 
    }





    addResult(result){
        this.results.push(result)
    }

    getStudentResults(student_id) {
        return new ResultBundle({
            results: this.results.filter(result => result.student.id === student_id),
            test: this.test
        });
    }

    getQuestionResults(question_id) {
        return new ResultBundle({
            results: this.results.filter(result => result.question.id === question_id),
            test: this.test
        });
    }

    getSectionResults(sectionId) {
        return new ResultBundle({
            results: this.results.filter(result => result.question.sections.some(section => section.id === sectionId)),
            test: this.test
        });
    }

    addResult(questionResult) {
        this.results.push(questionResult);
    }

    standardDeviation() {
        return standardDeviation(this.results.map(result => result.percent));
    }

    getTypeCorrelation(id_type, id1, id2) {
        let results1, results2, func;
        if (id_type === "student") {
            results1 = this.getStudentResults(id1).results;
            results2 = this.getStudentResults(id2).results;
            func = (target, current) => current.question.id === target.question.id;
        } else if (id_type === "question") {
            results1 = this.getQuestionResults(id1).results;
            results2 = this.getQuestionResults(id2).results;
            func = (target, current) => current.student.id === target.student.id;
        } else if (id_type === "section") {
            results1 = this.getSectionResults(id1).results;
            results2 = this.getSectionResults(id2).results;
            func = (target, current) => current.question.id === target.question.id;
        } else {
            return null;
        }
        const relatedList = [];

        for (const result of results1) {
            const answers = results2.filter(current => func(result, current));
            if (answers.length === 0) continue;
            relatedList.push([result, answers[0]]);
        }

        const list1 = relatedList.map(relation => relation[0]);
        const list2 = relatedList.map(relation => relation[1]);

        const value1 = list1.map(x => x.percent);
        const value2 = list2.map(x => x.percent);

        return correlation(value1, value2);
    }

    getTypeCorrelations(id_type, id1, id2) {
        // Implementation here...
    }
}
data_classes.ResultBundle = ResultBundle


// Section class
class Section extends BaseClass {
    constructor({id = uuidv4(), name = "", description = ""}) {
        super()
        this.id = id;
        this.name = name;
        this.description = description;
    }
}
data_classes.Section = Section

// Test class
class Test extends BaseClass {
    constructor({
        id = uuidv4(), 
        name = "", 
        results = new ResultBundle({}), 
        grade_formula = new GradeFormula({}), 
        questions=[],
        students=[],
        sections=[],

        data_type='points'
    }) {
        super()
        this.id = id;
        this.name = name;
        results.test = this
        this.results = results;
        
        this.original_grade_formula = grade_formula;
        this.grade_formula = grade_formula; // changed by user
        this.questions = questions
        this.students = students
        this.sections = sections

        this.data_type = data_type
    }
    getJsonRows(data_type="point"){
        
        const getData = (result) => {
            switch (data_type) {
                case "points":
                    return result.points
                    break;
                case "percent":
                    return result.percent

                    break;          
                default:
                    return 0
                    break;
            }
        }
        const getTotal = (result) => {
            switch (data_type) {
                case "points":
                    return result.total_points
                    break;
                case "percent":
                    return 1

                    break;          
                default:
                    break;
            }
        }
        
        const rows = [{
                id: 'Max', 
                ...this.questions.reduce((data,e) => {data['Q'+e.question_number] = getTotal(e); return data}, {}), 
                total: sum(this.questions.map(e => getTotal(e))),
                average: 1
            }, 
            ...this.students.map(student => {
                const result_bundle = this.results.getStudentResults(student.id)
                const results = result_bundle.results
                // console.log(results)
                const data = {
                    id: student.id,
                    ...results.reduce((row, result) => { 
                        row['Q'+result.question.question_number] = getData(result)

                        return row
                    }, {}),
                    total: result_bundle.points,
                    average: {
                        points: result_bundle.average_points,
                        percent: result_bundle.average_percent
                    }[data_type]
                }
                return data

            })
        ]
        return rows

    }
}
data_classes.Test = Test

// Example usage
export default data_classes